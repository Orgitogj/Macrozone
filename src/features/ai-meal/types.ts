import type { ServingUnit } from '@/features/library/types';
import type { MacroTotals } from '@/types/nutrition';

export type AiInputKind = 'text' | 'photo';

export type AiConfidence = 'low' | 'medium' | 'high';

export const AI_UNCERTAINTY_KINDS = [
  'portion_size',
  'overlapping_foods',
  'hidden_ingredients',
  'cooking_method',
  'added_fat_or_sauce',
  'photo_quality',
] as const;

export type AiUncertainty = (typeof AI_UNCERTAINTY_KINDS)[number];

export type AiServerErrorCode =
  | 'AI_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'INVALID_INPUT'
  | 'INVALID_IMAGE'
  | 'INVALID_AI_RESPONSE'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR';

export type AiErrorCode = AiServerErrorCode | 'OFFLINE' | 'NOT_CONFIGURED';

export type AiEstimatedItem = {
  name: string;
  amount: number;
  unit: ServingUnit;
  nutrition: MacroTotals;
  confidence: AiConfidence;
  note: string | null;
  uncertainties: AiUncertainty[];
};

export type AiMealAnalysis = {
  analysisId: string;
  inputKind: AiInputKind;
  title: string;
  items: AiEstimatedItem[];
  totals: MacroTotals;
  quality: AiConfidence;
  warnings: string[];
};

export type PreparedPhoto = {
  uri: string;
  base64: string;
  mediaType: 'image/jpeg';
  width: number;
  height: number;
  byteLength: number;
};

export type AiAnalysisInput = { kind: 'text'; text: string } | { kind: 'photo'; photo: PreparedPhoto; note: string | null };

export type AiAnalysisRequestBody =
  | { version: 1; inputKind: 'text'; text: string }
  | { version: 1; inputKind: 'photo'; image: { mediaType: 'image/jpeg'; base64: string }; note: string | null };

export type AiAnalysisOutcome =
  | { status: 'ok'; analysis: AiMealAnalysis }
  | { status: 'clarification'; question: string }
  | { status: 'error'; code: AiErrorCode; serverMessage: string | null; retryAfterSeconds: number | null }
  | { status: 'cancelled' };

export type AiEndpointConfig =
  | { status: 'configured'; analyzeUrl: string }
  | { status: 'not_configured' }
  | { status: 'invalid' };
