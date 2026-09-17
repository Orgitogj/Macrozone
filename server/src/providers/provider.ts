import type { ImageMediaType } from '../contract.ts';

export type ProviderInput =
  | { kind: 'text'; text: string }
  | { kind: 'photo'; mediaType: ImageMediaType; base64: string; note: string | null };

export type ProviderErrorCode =
  | 'AI_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'INVALID_AI_RESPONSE'
  | 'INVALID_INPUT'
  | 'CANCELLED';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly detail: string;
  readonly retryAfterSeconds: number | null;

  constructor(code: ProviderErrorCode, detail: string, retryAfterSeconds: number | null = null) {
    super(`Provider error: ${code}`);
    this.name = 'ProviderError';
    this.code = code;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type ProviderResult = {
  output: unknown;
  model: string;
  attempts: number;
};

export type ProviderCallOptions = {
  signal: AbortSignal;
  deadlineAt: number;
};

export type MealAnalysisProvider = {
  readonly name: string;
  analyze(input: ProviderInput, options: ProviderCallOptions): Promise<ProviderResult>;
};
