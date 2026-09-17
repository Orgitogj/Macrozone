import {
  buildErrorResponse,
  CONTRACT_VERSION,
  ERROR_DETAILS,
  RATE_LIMIT_KEY_HEADER,
  type ErrorCode,
  type ClarificationResponse,
  type ErrorResponse,
  type SuccessResponse,
} from '../contract.ts';
import type { ServerConfig } from '../config.ts';
import type { Logger } from '../logging/logger.ts';
import { isDeadlineReason } from '../providers/anthropicProvider.ts';
import { ProviderError, type MealAnalysisProvider, type ProviderInput, type ProviderResult } from '../providers/provider.ts';
import type { ConcurrencyLimiter, DailyBudgetDecision, UsageStore } from '../security/usageControls.ts';
import { parseAnalysisRequest } from '../validation/requestValidation.ts';
import { normalizeProviderOutput } from '../validation/resultValidation.ts';

export const ANALYSIS_PATH = '/v1/meal-analysis';

export const HEALTH_PATH = '/v1/health';

export type HandlerBody = { kind: 'text'; text: string } | { kind: 'too_large' } | { kind: 'none' };

export type HandlerRequest = {
  method: string;
  path: string;
  headers: Readonly<Record<string, string | undefined>>;
  body: HandlerBody;
  clientIp: string;
  signal: AbortSignal;
};

export type HandlerResponse = {
  status: number;
  headers: Record<string, string>;
  body: SuccessResponse | ClarificationResponse | ErrorResponse | { status: 'ok' } | null;
};

export type HandlerDependencies = {
  provider: MealAnalysisProvider;
  usage: UsageStore;
  concurrency: ConcurrencyLimiter;
  logger: Logger;
  config: Pick<
    ServerConfig,
    'keyRateLimit' | 'keyDailyLimit' | 'ipRateLimit' | 'allowedOrigins' | 'requestTimeoutMs' | 'dailyRequestBudget'
  >;
  now: () => number;
  generateId: () => string;
};

const RATE_LIMIT_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OVERLOAD_RETRY_AFTER_SECONDS = 5;

const MAX_CLIENT_RETRY_AFTER_SECONDS = 3600;

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'content-type': 'application/json; charset=utf-8',
};

function waitForAbort(signal: AbortSignal): { promise: Promise<never>; dispose: () => void } {
  let dispose: () => void = () => undefined;
  const promise = new Promise<never>((_resolve, reject) => {
    const fail = () => reject(new ProviderError(isDeadlineReason(signal.reason) ? 'AI_TIMEOUT' : 'CANCELLED', 'handler_abort'));
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener('abort', fail, { once: true });
    dispose = () => signal.removeEventListener('abort', fail);
  });
  promise.catch(() => undefined);
  return { promise, dispose: () => dispose() };
}

export async function handleRequest(request: HandlerRequest, deps: HandlerDependencies): Promise<HandlerResponse> {
  const startedAt = deps.now();
  const requestId = deps.generateId();
  const origin = request.headers.origin;
  const originAllowed = origin !== undefined && deps.config.allowedOrigins.includes(origin);
  const corsHeaders: Record<string, string> = originAllowed
    ? { 'access-control-allow-origin': origin, 'access-control-expose-headers': 'retry-after', vary: 'Origin' }
    : {};
  const logContext: Record<string, string | number | null> = { requestId, method: request.method, route: request.path };

  const respond = (status: number, body: HandlerResponse['body'], extraHeaders: Record<string, string> = {}): HandlerResponse => {
    deps.logger.info('request_completed', { ...logContext, status, durationMs: deps.now() - startedAt });
    return { status, headers: { ...BASE_HEADERS, ...corsHeaders, ...extraHeaders }, body };
  };

  const fail = (code: ErrorCode, message?: string, extraHeaders: Record<string, string> = {}, status = ERROR_DETAILS[code].status) => {
    logContext.code = code;
    return respond(status, buildErrorResponse(code, message), extraHeaders);
  };

  const retryAfter = (seconds: number) => ({ 'retry-after': String(Math.min(Math.max(1, seconds), MAX_CLIENT_RETRY_AFTER_SECONDS)) });

  if (origin !== undefined && !originAllowed) {
    return fail('INVALID_INPUT', 'This origin is not allowed.', {}, 403);
  }

  if (request.method === 'OPTIONS') {
    return request.path === ANALYSIS_PATH
      ? respond(204, null, {
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': `content-type, ${RATE_LIMIT_KEY_HEADER}`,
          'access-control-max-age': '600',
        })
      : fail('NOT_FOUND');
  }

  if (request.path === HEALTH_PATH && request.method === 'GET') {
    return respond(200, { status: 'ok' });
  }

  if (request.path !== ANALYSIS_PATH) {
    return fail('NOT_FOUND');
  }
  if (request.method !== 'POST') {
    return fail('INVALID_INPUT', 'Use POST for meal analysis.', { allow: 'POST, OPTIONS' }, 405);
  }
  if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    return fail('INVALID_INPUT', 'Send the request as JSON.', {}, 415);
  }

  const rateLimitKey = request.headers[RATE_LIMIT_KEY_HEADER];
  if (rateLimitKey === undefined || !RATE_LIMIT_KEY_PATTERN.test(rateLimitKey)) {
    return fail('INVALID_INPUT', 'The request is missing a valid rate-limit key.');
  }

  const decision = deps.usage.rateLimiter.consume(
    [
      { scope: 'ip-minute', id: request.clientIp, rule: deps.config.ipRateLimit },
      { scope: 'key-minute', id: rateLimitKey.toLowerCase(), rule: deps.config.keyRateLimit },
      { scope: 'key-day', id: rateLimitKey.toLowerCase(), rule: deps.config.keyDailyLimit },
    ],
    deps.now(),
  );
  if (!decision.allowed) {
    return fail('AI_RATE_LIMITED', undefined, retryAfter(decision.retryAfterSeconds));
  }

  if (request.body.kind === 'too_large') {
    return fail('INVALID_INPUT', 'The request is too large.', {}, 413);
  }
  if (request.body.kind === 'none') {
    return fail('INVALID_INPUT', 'The request body is empty.');
  }

  let json: unknown;
  try {
    json = JSON.parse(request.body.text);
  } catch {
    return fail('INVALID_INPUT', 'The request body is not valid JSON.');
  }

  const parsed = parseAnalysisRequest(json);
  if (!parsed.ok) {
    return fail(parsed.code, parsed.message);
  }

  const analysisRequest = parsed.request;
  logContext.inputKind = analysisRequest.inputKind;
  logContext.imageBytes = parsed.imageBytes;
  logContext.textLength = analysisRequest.inputKind === 'text' ? analysisRequest.text.length : null;

  const release = deps.concurrency.tryAcquire();
  if (release === null) {
    logContext.detail = 'server_at_capacity';
    return fail('AI_UNAVAILABLE', undefined, retryAfter(OVERLOAD_RETRY_AFTER_SECONDS));
  }

  let pendingProvider: Promise<unknown> | null = null;
  try {
    let budget: DailyBudgetDecision;
    try {
      budget = deps.usage.dailyBudget.consume(deps.config.dailyRequestBudget, deps.now());
    } catch {
      logContext.detail = 'budget_store_failed';
      return fail('AI_UNAVAILABLE', undefined, retryAfter(OVERLOAD_RETRY_AFTER_SECONDS));
    }
    if (!budget.allowed) {
      logContext.detail = 'daily_budget_exhausted';
      return fail('AI_UNAVAILABLE', undefined, retryAfter(budget.retryAfterSeconds));
    }

    const providerInput: ProviderInput =
      analysisRequest.inputKind === 'text'
        ? { kind: 'text', text: analysisRequest.text }
        : {
            kind: 'photo',
            mediaType: analysisRequest.image.mediaType,
            base64: analysisRequest.image.base64,
            note: analysisRequest.note,
          };

    const deadlineAt = deps.now() + deps.config.requestTimeoutMs;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(deps.config.requestTimeoutMs)]);
    const abort = waitForAbort(signal);

    let result: ProviderResult;
    try {
      const providerCall = deps.provider.analyze(providerInput, { signal, deadlineAt });
      pendingProvider = providerCall;
      result = await Promise.race([providerCall, abort.promise]);
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : new ProviderError('AI_UNAVAILABLE', 'unexpected_error');
      logContext.detail = providerError.detail;
      if (providerError.code === 'CANCELLED') {
        logContext.code = 'CANCELLED';
        return respond(499, null);
      }
      if (providerError.code === 'INVALID_INPUT') {
        return fail('INVALID_INPUT', 'This content could not be analyzed as a meal.', {}, 422);
      }
      if (providerError.code === 'AI_RATE_LIMITED') {
        return fail('AI_RATE_LIMITED', undefined, providerError.retryAfterSeconds === null ? {} : retryAfter(providerError.retryAfterSeconds));
      }
      return fail(providerError.code);
    } finally {
      abort.dispose();
    }

    logContext.model = result.model;
    logContext.attempts = result.attempts;
    const normalized = normalizeProviderOutput(result.output, {
      analysisId: requestId,
      inputKind: analysisRequest.inputKind,
    });
    if (!normalized.ok) {
      switch (normalized.reason) {
        case 'no_food':
          return fail('INVALID_INPUT', 'No food or drink could be identified. Try a clearer description or photo.', {}, 422);
        case 'unusable_photo':
          return fail('INVALID_IMAGE', 'The photo is too unclear to estimate. Try a sharper, well-lit photo of the whole plate.', {}, 422);
        case 'invalid':
          return fail('INVALID_AI_RESPONSE');
      }
    }

    if (normalized.kind === 'clarification') {
      logContext.detail = 'needs_clarification';
      return respond(200, {
        version: CONTRACT_VERSION,
        status: 'needs_clarification',
        clarification: { analysisId: requestId, inputKind: analysisRequest.inputKind, question: normalized.question },
      });
    }

    logContext.itemCount = normalized.result.items.length;
    return respond(200, { version: CONTRACT_VERSION, status: 'ok', result: normalized.result });
  } finally {
    if (pendingProvider === null) {
      release();
    } else {
      void pendingProvider.then(release, release);
    }
  }
}
