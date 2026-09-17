import type { AiErrorCode } from '@/features/ai-meal/types';

export type AiErrorPresentation = {
  title: string;
  message: string;
  canRetry: boolean;
};

export function describeAiError(code: AiErrorCode, serverMessage: string | null, retryAfterSeconds: number | null): AiErrorPresentation {
  switch (code) {
    case 'OFFLINE':
      return {
        title: 'You appear to be offline',
        message: 'Connect to the internet and try again, or log this meal manually.',
        canRetry: true,
      };
    case 'NOT_CONFIGURED':
      return {
        title: 'AI estimates are not set up',
        message: 'This version of MacroZone is not connected to an AI service. You can log this meal manually.',
        canRetry: false,
      };
    case 'AI_UNAVAILABLE':
      return {
        title: 'AI estimates are unavailable',
        message: 'The AI service is temporarily unavailable. Try again later, or log this meal manually.',
        canRetry: true,
      };
    case 'AI_TIMEOUT':
      return { title: 'The estimate took too long', message: 'Try again, or log this meal manually.', canRetry: true };
    case 'AI_RATE_LIMITED':
      return {
        title: 'Too many requests',
        message:
          retryAfterSeconds !== null && retryAfterSeconds > 0
            ? `You have made several AI requests recently. Try again in about ${Math.min(retryAfterSeconds, 3600) >= 60 ? `${Math.ceil(Math.min(retryAfterSeconds, 3600) / 60)} min` : `${retryAfterSeconds} s`}.`
            : 'You have made several AI requests recently. Wait a moment and try again.',
        canRetry: true,
      };
    case 'INVALID_INPUT':
      return {
        title: 'This could not be estimated',
        message: serverMessage ?? 'Try describing the meal differently, with foods and amounts.',
        canRetry: false,
      };
    case 'INVALID_IMAGE':
      return { title: 'This photo could not be used', message: serverMessage ?? 'Try another photo.', canRetry: false };
    case 'INVALID_AI_RESPONSE':
      return { title: 'The estimate was not usable', message: 'Try again, or log this meal manually.', canRetry: true };
    case 'UNAUTHORIZED':
      return {
        title: 'AI estimates are not available',
        message: 'The AI service did not accept this request. You can log this meal manually.',
        canRetry: false,
      };
    case 'SERVER_ERROR':
      return { title: 'Something went wrong', message: 'Try again, or log this meal manually.', canRetry: true };
  }
}
