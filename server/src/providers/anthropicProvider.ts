import Anthropic from '@anthropic-ai/sdk';

import type { ProviderEffort } from './models.ts';
import { buildPhotoInstruction, buildTextInstruction, MEAL_ESTIMATE_OUTPUT_SCHEMA, MEAL_ESTIMATE_SYSTEM_PROMPT } from './prompt.ts';
import { ProviderError, type MealAnalysisProvider, type ProviderInput } from './provider.ts';
import { DEFAULT_RETRY_POLICY, realSleep, runWithRetries, type AttemptFailure, type RetryPolicy, type Sleep } from './retry.ts';

type CreateParams = Anthropic.Messages.MessageCreateParamsNonStreaming;

export type CreateMessage = (
  params: CreateParams,
  options: { signal: AbortSignal; timeout: number; maxRetries: 0 },
) => Promise<Anthropic.Messages.Message>;

export type AnthropicProviderOptions = {
  apiKey: string;
  model: string;
  effort: ProviderEffort;
  maxOutputTokens: number;
  attemptTimeoutMs: number;
  retryPolicy?: RetryPolicy;
  createMessage?: CreateMessage;
  now?: () => number;
  sleep?: Sleep;
  random?: () => number;
};

const MAX_RETRY_AFTER_SECONDS = 3600;

export function buildMessageParams(input: ProviderInput, model: string, effort: ProviderEffort, maxOutputTokens: number): CreateParams {
  const content: Anthropic.Messages.ContentBlockParam[] =
    input.kind === 'text'
      ? [{ type: 'text', text: buildTextInstruction(input.text) }]
      : [
          { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.base64 } },
          { type: 'text', text: buildPhotoInstruction(input.note) },
        ];
  return {
    model,
    max_tokens: maxOutputTokens,
    system: MEAL_ESTIMATE_SYSTEM_PROMPT,
    output_config: { effort, format: { type: 'json_schema', schema: MEAL_ESTIMATE_OUTPUT_SCHEMA } },
    messages: [{ role: 'user', content }],
  };
}

export function isDeadlineReason(reason: unknown): boolean {
  return typeof reason === 'object' && reason !== null && 'name' in reason && reason.name === 'TimeoutError';
}

export function parseRetryAfterMs(headers: Headers | undefined): number | null {
  const milliseconds = headers?.get('retry-after-ms')?.trim();
  if (milliseconds && /^\d{1,9}$/.test(milliseconds)) {
    return Math.min(Number(milliseconds), MAX_RETRY_AFTER_SECONDS * 1000);
  }
  const seconds = headers?.get('retry-after')?.trim();
  if (seconds && /^\d{1,6}$/.test(seconds)) {
    return Math.min(Number(seconds), MAX_RETRY_AFTER_SECONDS) * 1000;
  }
  return null;
}

export function classifyAnthropicError(error: unknown): AttemptFailure {
  if (error instanceof ProviderError) {
    return { kind: 'final', error };
  }
  if (error instanceof Anthropic.RateLimitError) {
    const retryAfterMs = parseRetryAfterMs(error.headers);
    return {
      kind: 'rate_limited',
      retryAfterMs,
      error: new ProviderError(
        'AI_RATE_LIMITED',
        'provider_rate_limited',
        retryAfterMs === null ? null : Math.max(1, Math.ceil(retryAfterMs / 1000)),
      ),
    };
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return { kind: 'transient', error: new ProviderError('AI_TIMEOUT', 'provider_timeout') };
  }
  if (error instanceof Anthropic.APIUserAbortError) {
    return { kind: 'final', error: new ProviderError('CANCELLED', 'aborted') };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { kind: 'transient', error: new ProviderError('AI_UNAVAILABLE', 'provider_connection_failed') };
  }
  if (error instanceof Anthropic.InternalServerError) {
    return { kind: 'transient', error: new ProviderError('AI_UNAVAILABLE', `provider_status_${error.status}`) };
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { kind: 'final', error: new ProviderError('AI_UNAVAILABLE', 'provider_credentials_rejected') };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return { kind: 'final', error: new ProviderError('AI_UNAVAILABLE', 'provider_rejected_request') };
  }
  if (error instanceof Anthropic.APIError) {
    return { kind: 'final', error: new ProviderError('AI_UNAVAILABLE', `provider_status_${String(error.status)}`) };
  }
  return { kind: 'final', error: new ProviderError('AI_UNAVAILABLE', 'provider_unexpected_error') };
}

export function readStructuredOutput(message: Anthropic.Messages.Message): unknown {
  if (message.stop_reason === 'refusal') {
    throw new ProviderError('INVALID_INPUT', 'provider_refused');
  }
  if (message.stop_reason !== 'end_turn') {
    throw new ProviderError('INVALID_AI_RESPONSE', `provider_stop_${String(message.stop_reason)}`);
  }
  const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError('INVALID_AI_RESPONSE', 'provider_output_not_json');
  }
}

export function createAnthropicProvider(options: AnthropicProviderOptions): MealAnalysisProvider {
  const createMessage: CreateMessage =
    options.createMessage ??
    (() => {
      const client = new Anthropic({ apiKey: options.apiKey, maxRetries: 0 });
      return (params, requestOptions) => client.messages.create(params, requestOptions);
    })();
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? realSleep;
  const random = options.random ?? Math.random;
  const policy = options.retryPolicy ?? DEFAULT_RETRY_POLICY;

  return {
    name: 'anthropic',
    analyze: async (input, { signal, deadlineAt }) => {
      const params = buildMessageParams(input, options.model, options.effort, options.maxOutputTokens);
      const { value, attempts } = await runWithRetries({
        attempt: async (remainingMs) => {
          const message = await createMessage(params, {
            signal,
            timeout: Math.min(options.attemptTimeoutMs, remainingMs),
            maxRetries: 0,
          });
          return { output: readStructuredOutput(message), model: message.model };
        },
        classify: classifyAnthropicError,
        policy,
        signal,
        deadlineAt,
        now,
        sleep,
        random,
      });
      return { output: value.output, model: value.model, attempts };
    },
  };
}
