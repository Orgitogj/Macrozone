import {
  CONFIDENCE_LEVELS,
  LIMITS,
  SERVING_UNITS,
  UNCERTAINTY_KINDS,
  type AnalysisItem,
  type AnalysisResult,
  type ConfidenceLevel,
  type ServingUnit,
  type UncertaintyKind,
} from '../contract.ts';
import { computeTotals, roundNutrition, roundNutritionValue } from '../nutrition.ts';

export type ResultValidation =
  | { ok: true; kind: 'estimate'; result: AnalysisResult }
  | { ok: true; kind: 'clarification'; question: string }
  | { ok: false; reason: 'no_food' | 'unusable_photo' | 'invalid' };

export const UNCERTAINTY_WARNINGS: Readonly<Record<UncertaintyKind, string>> = {
  portion_size: 'Some portion sizes could not be estimated reliably.',
  overlapping_foods: 'Some foods overlap, so their amounts are harder to judge.',
  hidden_ingredients: 'Some ingredients may be hidden or not visible.',
  cooking_method: 'The cooking method is unclear, which can change calories and fat.',
  added_fat_or_sauce: 'Oil, butter, dressing, or sauce may add calories that are hard to see.',
  photo_quality: 'The photo quality limits how accurate this estimate can be.',
};

const CONFIDENCE_RANK: Readonly<Record<ConfidenceLevel, number>> = { low: 0, medium: 1, high: 2 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnit(value: unknown): value is ServingUnit {
  return typeof value === 'string' && (SERVING_UNITS as readonly string[]).includes(value);
}

function isConfidence(value: unknown): value is ConfidenceLevel {
  return typeof value === 'string' && (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

function lowerConfidence(first: ConfidenceLevel, second: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[first] <= CONFIDENCE_RANK[second] ? first : second;
}

export function capConfidence(confidence: ConfidenceLevel, uncertainties: readonly UncertaintyKind[]): ConfidenceLevel {
  if (uncertainties.includes('photo_quality')) {
    return 'low';
  }
  return uncertainties.length > 0 ? lowerConfidence(confidence, 'medium') : confidence;
}

function parseUncertainties(value: unknown): UncertaintyKind[] | null {
  if (!Array.isArray(value) || value.length > UNCERTAINTY_KINDS.length * 2) {
    return null;
  }
  if (!value.every((entry) => typeof entry === 'string' && (UNCERTAINTY_KINDS as readonly string[]).includes(entry))) {
    return null;
  }
  return UNCERTAINTY_KINDS.filter((kind) => value.includes(kind));
}

function isBoundedNumber(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseItem(value: unknown): AnalysisItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const { name, amount, unit, calories, protein, carbs, fat, confidence, note } = value;
  const uncertainties = parseUncertainties(value.uncertainties);
  if (typeof name !== 'string') {
    return null;
  }
  const cleanName = cleanText(name);
  if (
    cleanName.length === 0 ||
    cleanName.length > LIMITS.maxNameLength ||
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > LIMITS.maxAmount ||
    !isUnit(unit) ||
    !isBoundedNumber(calories, LIMITS.maxCalories) ||
    !isBoundedNumber(protein, LIMITS.maxMacroGrams) ||
    !isBoundedNumber(carbs, LIMITS.maxMacroGrams) ||
    !isBoundedNumber(fat, LIMITS.maxMacroGrams) ||
    !isConfidence(confidence) ||
    uncertainties === null ||
    !(note === null || typeof note === 'string')
  ) {
    return null;
  }
  const roundedAmount = roundNutritionValue(amount);
  if (roundedAmount <= 0) {
    return null;
  }
  const cleanNote = typeof note === 'string' ? cleanText(note).slice(0, LIMITS.maxNoteLength) : '';
  return {
    name: cleanName,
    amount: roundedAmount,
    unit,
    ...roundNutrition({ calories, protein, carbs, fat }),
    confidence: capConfidence(confidence, uncertainties),
    note: cleanNote.length > 0 ? cleanNote : null,
    uncertainties,
  };
}

export function hasImplausibleEnergy(item: AnalysisItem): boolean {
  const macroEnergy = item.protein * 4 + item.carbs * 4 + item.fat * 9;
  return macroEnergy > item.calories * 1.5 + 50;
}

export function normalizeProviderOutput(
  value: unknown,
  context: { analysisId: string; inputKind: 'text' | 'photo' },
): ResultValidation {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return { ok: false, reason: 'invalid' };
  }
  switch (value.outcome) {
    case 'no_food':
      return { ok: false, reason: 'no_food' };
    case 'unusable_photo':
      return context.inputKind === 'photo' ? { ok: false, reason: 'unusable_photo' } : { ok: false, reason: 'invalid' };
    case 'needs_clarification': {
      const question = typeof value.clarificationQuestion === 'string' ? cleanText(value.clarificationQuestion) : '';
      return question.length > 0 && question.length <= LIMITS.maxQuestionLength
        ? { ok: true, kind: 'clarification', question }
        : { ok: false, reason: 'invalid' };
    }
    case 'estimate':
      break;
    default:
      return { ok: false, reason: 'invalid' };
  }
  if (value.items.length === 0) {
    return { ok: false, reason: 'no_food' };
  }
  if (value.items.length > LIMITS.maxItems) {
    return { ok: false, reason: 'invalid' };
  }
  const parsedItems: AnalysisItem[] = [];
  for (const entry of value.items) {
    const item = parseItem(entry);
    if (!item) {
      return { ok: false, reason: 'invalid' };
    }
    parsedItems.push(item);
  }
  const mealUncertainties = parseUncertainties(value.uncertainties);
  if (!isConfidence(value.quality) || mealUncertainties === null || !Array.isArray(value.warnings) || typeof value.title !== 'string') {
    return { ok: false, reason: 'invalid' };
  }
  const items = parsedItems.map((item) => ({ ...item, confidence: capConfidence(item.confidence, mealUncertainties.filter((kind) => kind === 'photo_quality')) }));
  const allUncertainties = UNCERTAINTY_KINDS.filter(
    (kind) => mealUncertainties.includes(kind) || items.some((item) => item.uncertainties.includes(kind)),
  );
  const warnings = allUncertainties.map((kind) => UNCERTAINTY_WARNINGS[kind]);
  if (items.some(hasImplausibleEnergy)) {
    warnings.push('Some calorie and macro estimates do not add up. Check them before saving.');
  }
  for (const warning of value.warnings) {
    if (typeof warning === 'string') {
      const cleaned = cleanText(warning).slice(0, LIMITS.maxWarningLength);
      if (cleaned.length > 0) {
        warnings.push(cleaned);
      }
    }
  }
  const title = cleanText(value.title).slice(0, LIMITS.maxNameLength);
  return {
    ok: true,
    kind: 'estimate',
    result: {
      analysisId: context.analysisId,
      inputKind: context.inputKind,
      title: title.length > 0 ? title : 'Estimated meal',
      items,
      totals: computeTotals(items),
      quality: capConfidence(value.quality, allUncertainties),
      warnings: [...new Set(warnings)].slice(0, LIMITS.maxWarnings),
    },
  };
}
