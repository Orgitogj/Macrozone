import { AI_CONTRACT_VERSION, AI_LIMITS } from '@/features/ai-meal/constants';
import type {
  AiConfidence,
  AiErrorCode,
  AiEstimatedItem,
  AiInputKind,
  AiMealAnalysis,
  AiServerErrorCode,
  AiUncertainty,
} from '@/features/ai-meal/types';
import { AI_UNCERTAINTY_KINDS } from '@/features/ai-meal/types';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { roundNutrition, roundNutritionValue, sumNutrition } from '@/features/library/utils/nutritionMath';
import { isServingUnit } from '@/features/library/utils/servingFormat';
import { MEAL_LIMITS } from '@/features/meals/constants';
import { MACRO_KEYS, type MacroTotals } from '@/types/nutrition';

export type ParsedAnalysisResponse =
  | { ok: true; kind: 'analysis'; analysis: AiMealAnalysis }
  | { ok: true; kind: 'clarification'; question: string }
  | { ok: false; code: AiErrorCode; serverMessage: string | null };

const SERVER_ERROR_CODES: readonly AiServerErrorCode[] = [
  'AI_UNAVAILABLE',
  'AI_TIMEOUT',
  'AI_RATE_LIMITED',
  'INVALID_INPUT',
  'INVALID_IMAGE',
  'INVALID_AI_RESPONSE',
  'UNAUTHORIZED',
  'SERVER_ERROR',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConfidence(value: unknown): value is AiConfidence {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isBounded(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

function isCleanText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength && !/[\u0000-\u001F\u007F]/.test(value);
}

function parseUncertainties(value: unknown): AiUncertainty[] | null {
  if (!Array.isArray(value) || value.length > AI_UNCERTAINTY_KINDS.length) {
    return null;
  }
  const kinds: AiUncertainty[] = [];
  for (const entry of value) {
    const kind = AI_UNCERTAINTY_KINDS.find((candidate) => candidate === entry);
    if (kind === undefined || kinds.includes(kind)) {
      return null;
    }
    kinds.push(kind);
  }
  return kinds;
}

function parseItem(value: unknown): AiEstimatedItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const { name, amount, unit, calories, protein, carbs, fat, confidence, note } = value;
  const uncertainties = parseUncertainties(value.uncertainties);
  if (
    uncertainties === null ||
    !isCleanText(name, LIBRARY_LIMITS.nameMaxLength) ||
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > LIBRARY_LIMITS.maxPortionAmount ||
    roundNutritionValue(amount) !== amount ||
    !isServingUnit(unit) ||
    !isBounded(calories, MEAL_LIMITS.maxCalories) ||
    !isBounded(protein, MEAL_LIMITS.maxMacroGrams) ||
    !isBounded(carbs, MEAL_LIMITS.maxMacroGrams) ||
    !isBounded(fat, MEAL_LIMITS.maxMacroGrams) ||
    !isConfidence(confidence) ||
    !(note === null || isCleanText(note, AI_LIMITS.maxNoteLength))
  ) {
    return null;
  }
  return {
    name: name.trim(),
    amount,
    unit,
    nutrition: roundNutrition({ calories, protein, carbs, fat }),
    confidence,
    note,
    uncertainties,
  };
}

function parseTotals(value: unknown): MacroTotals | null {
  if (!isRecord(value)) {
    return null;
  }
  const totals = { calories: value.calories, protein: value.protein, carbs: value.carbs, fat: value.fat };
  return MACRO_KEYS.every((key) => typeof totals[key] === 'number' && Number.isFinite(totals[key]) && (totals[key] as number) >= 0)
    ? (totals as MacroTotals)
    : null;
}

export function recomputeAnalysisTotals(items: readonly AiEstimatedItem[]): MacroTotals {
  return roundNutrition(sumNutrition(items.map((item) => roundNutrition(item.nutrition))));
}

function invalid(): ParsedAnalysisResponse {
  return { ok: false, code: 'INVALID_AI_RESPONSE', serverMessage: null };
}

export function parseAnalysisResponse(value: unknown, expectedInputKind: AiInputKind): ParsedAnalysisResponse {
  if (!isRecord(value) || value.version !== AI_CONTRACT_VERSION) {
    return invalid();
  }
  if (value.status === 'error') {
    const error = value.error;
    if (!isRecord(error)) {
      return { ok: false, code: 'SERVER_ERROR', serverMessage: null };
    }
    const code = SERVER_ERROR_CODES.find((candidate) => candidate === error.code) ?? 'SERVER_ERROR';
    const serverMessage =
      (code === 'INVALID_INPUT' || code === 'INVALID_IMAGE') && isCleanText(error.message, AI_LIMITS.maxWarningLength)
        ? error.message
        : null;
    return { ok: false, code, serverMessage };
  }
  if (value.status === 'needs_clarification') {
    const clarification = value.clarification;
    return isRecord(clarification) &&
      isCleanText(clarification.analysisId, 100) &&
      clarification.inputKind === expectedInputKind &&
      isCleanText(clarification.question, AI_LIMITS.maxQuestionLength)
      ? { ok: true, kind: 'clarification', question: clarification.question.trim() }
      : invalid();
  }
  if (value.status !== 'ok' || !isRecord(value.result)) {
    return invalid();
  }
  const result = value.result;
  if (
    !isCleanText(result.analysisId, 100) ||
    result.inputKind !== expectedInputKind ||
    !isCleanText(result.title, AI_LIMITS.maxTitleLength) ||
    !Array.isArray(result.items) ||
    result.items.length === 0 ||
    result.items.length > AI_LIMITS.maxItems ||
    !isConfidence(result.quality) ||
    !Array.isArray(result.warnings) ||
    result.warnings.length > AI_LIMITS.maxWarnings ||
    !result.warnings.every((warning) => isCleanText(warning, AI_LIMITS.maxWarningLength))
  ) {
    return invalid();
  }
  const items = result.items.map(parseItem);
  if (!items.every((item): item is AiEstimatedItem => item !== null)) {
    return invalid();
  }
  const reportedTotals = parseTotals(result.totals);
  const totals = recomputeAnalysisTotals(items);
  if (
    reportedTotals === null ||
    MACRO_KEYS.some((key) => Math.abs(reportedTotals[key] - totals[key]) > AI_LIMITS.totalsTolerance)
  ) {
    return invalid();
  }
  return {
    ok: true,
    kind: 'analysis',
    analysis: {
      analysisId: result.analysisId,
      inputKind: expectedInputKind,
      title: result.title.trim(),
      items,
      totals,
      quality: result.quality,
      warnings: result.warnings as string[],
    },
  };
}
