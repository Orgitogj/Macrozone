export const CONTRACT_VERSION = 1;

export const SERVING_UNITS = ['g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp'] as const;

export type ServingUnit = (typeof SERVING_UNITS)[number];

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const UNCERTAINTY_KINDS = [
  'portion_size',
  'overlapping_foods',
  'hidden_ingredients',
  'cooking_method',
  'added_fat_or_sauce',
  'photo_quality',
] as const;

export type UncertaintyKind = (typeof UNCERTAINTY_KINDS)[number];

export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

export const ERROR_CODES = [
  'AI_UNAVAILABLE',
  'AI_TIMEOUT',
  'AI_RATE_LIMITED',
  'INVALID_INPUT',
  'INVALID_IMAGE',
  'INVALID_AI_RESPONSE',
  'UNAUTHORIZED',
  'SERVER_ERROR',
  'NOT_FOUND',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const LIMITS = {
  minTextLength: 3,
  maxTextLength: 500,
  maxItems: 20,
  maxNameLength: 80,
  maxNoteLength: 200,
  maxWarnings: 8,
  maxPhotoNoteLength: 300,
  maxQuestionLength: 200,
  maxWarningLength: 200,
  maxAmount: 100000,
  maxCalories: 10000,
  maxMacroGrams: 1000,
  maxImageBytes: 1_100_000,
  maxBodyBytes: 1_600_000,
} as const;

export const RATE_LIMIT_KEY_HEADER = 'x-macrozone-rate-limit-key';

export type NutritionValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type AnalysisRequest =
  | { version: 1; inputKind: 'text'; text: string }
  | { version: 1; inputKind: 'photo'; image: { mediaType: ImageMediaType; base64: string }; note: string | null };

export type AnalysisItem = NutritionValues & {
  name: string;
  amount: number;
  unit: ServingUnit;
  confidence: ConfidenceLevel;
  note: string | null;
  uncertainties: UncertaintyKind[];
};

export type AnalysisResult = {
  analysisId: string;
  inputKind: 'text' | 'photo';
  title: string;
  items: AnalysisItem[];
  totals: NutritionValues;
  quality: ConfidenceLevel;
  warnings: string[];
};

export type SuccessResponse = {
  version: 1;
  status: 'ok';
  result: AnalysisResult;
};

export type ClarificationResponse = {
  version: 1;
  status: 'needs_clarification';
  clarification: { analysisId: string; inputKind: 'text' | 'photo'; question: string };
};

export type ErrorResponse = {
  version: 1;
  status: 'error';
  error: { code: ErrorCode; message: string; retryable: boolean };
};

export const ERROR_DETAILS: Readonly<Record<ErrorCode, { status: number; message: string; retryable: boolean }>> = {
  AI_UNAVAILABLE: { status: 503, message: 'Meal analysis is temporarily unavailable.', retryable: true },
  AI_TIMEOUT: { status: 504, message: 'Meal analysis took too long.', retryable: true },
  AI_RATE_LIMITED: { status: 429, message: 'Too many analysis requests. Please wait and try again.', retryable: true },
  INVALID_INPUT: { status: 400, message: 'The meal description could not be analyzed.', retryable: false },
  INVALID_IMAGE: { status: 400, message: 'The photo could not be used for analysis.', retryable: false },
  INVALID_AI_RESPONSE: { status: 502, message: 'The analysis result was not usable.', retryable: true },
  UNAUTHORIZED: { status: 401, message: 'This request is not authorized.', retryable: false },
  SERVER_ERROR: { status: 500, message: 'Something went wrong on the server.', retryable: true },
  NOT_FOUND: { status: 404, message: 'Not found.', retryable: false },
};

export function buildErrorResponse(code: ErrorCode, message?: string): ErrorResponse {
  const details = ERROR_DETAILS[code];
  return { version: CONTRACT_VERSION, status: 'error', error: { code, message: message ?? details.message, retryable: details.retryable } };
}
