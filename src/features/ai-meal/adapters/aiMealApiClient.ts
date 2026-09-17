import { AI_RATE_LIMIT_KEY_HEADER, AI_LIMITS } from '@/features/ai-meal/constants';
import type { AiAnalysisOutcome, AiAnalysisRequestBody, AiErrorCode } from '@/features/ai-meal/types';
import { parseAnalysisResponse } from '@/features/ai-meal/validation/analysisResponse';

export type FetchLike = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

export type AiMealApiClient = {
  analyze(request: AiAnalysisRequestBody, options: { signal: AbortSignal }): Promise<AiAnalysisOutcome>;
};

function parseRetryAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,5}$/.test(value.trim())) {
    return null;
  }
  return Number(value.trim());
}

function codeForStatus(status: number): AiErrorCode {
  if (status === 401 || status === 403) {
    return 'UNAUTHORIZED';
  }
  if (status === 429) {
    return 'AI_RATE_LIMITED';
  }
  if (status === 504) {
    return 'AI_TIMEOUT';
  }
  if (status >= 500) {
    return 'AI_UNAVAILABLE';
  }
  return 'INVALID_AI_RESPONSE';
}

export function createAiMealApiClient({
  analyzeUrl,
  getRateLimitKey,
  fetchImpl,
  timeoutMs = AI_LIMITS.requestTimeoutMs,
}: {
  analyzeUrl: string;
  getRateLimitKey: () => Promise<string>;
  fetchImpl: FetchLike;
  timeoutMs?: number;
}): AiMealApiClient {
  return {
    analyze: async (request, { signal }) => {
      if (signal.aborted) {
        return { status: 'cancelled' };
      }
      let rateLimitKey: string;
      try {
        rateLimitKey = await getRateLimitKey();
      } catch {
        return { status: 'error', code: 'SERVER_ERROR', serverMessage: null, retryAfterSeconds: null };
      }

      const controller = new AbortController();
      let timedOut = false;
      const onAbort = () => controller.abort();
      signal.addEventListener('abort', onAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      try {
        let response: Awaited<ReturnType<FetchLike>>;
        try {
          response = await fetchImpl(analyzeUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/json',
              [AI_RATE_LIMIT_KEY_HEADER]: rateLimitKey,
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });
        } catch {
          if (signal.aborted) {
            return { status: 'cancelled' };
          }
          return {
            status: 'error',
            code: timedOut ? 'AI_TIMEOUT' : 'OFFLINE',
            serverMessage: null,
            retryAfterSeconds: null,
          };
        }

        let text: string;
        try {
          text = await response.text();
        } catch {
          if (signal.aborted) {
            return { status: 'cancelled' };
          }
          return { status: 'error', code: timedOut ? 'AI_TIMEOUT' : 'OFFLINE', serverMessage: null, retryAfterSeconds: null };
        }
        if (signal.aborted) {
          return { status: 'cancelled' };
        }

        const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'));
        let json: unknown;
        try {
          json = text.length > AI_LIMITS.maxResponseCharacters ? undefined : JSON.parse(text);
        } catch {
          json = undefined;
        }
        if (json === undefined) {
          return {
            status: 'error',
            code: response.ok ? 'INVALID_AI_RESPONSE' : codeForStatus(response.status),
            serverMessage: null,
            retryAfterSeconds,
          };
        }

        const parsed = parseAnalysisResponse(json, request.inputKind);
        if (parsed.ok) {
          if (!response.ok) {
            return { status: 'error', code: 'INVALID_AI_RESPONSE', serverMessage: null, retryAfterSeconds: null };
          }
          return parsed.kind === 'analysis'
            ? { status: 'ok', analysis: parsed.analysis }
            : { status: 'clarification', question: parsed.question };
        }
        return { status: 'error', code: parsed.code, serverMessage: parsed.serverMessage, retryAfterSeconds };
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
      }
    },
  };
}
