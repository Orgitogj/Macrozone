import { AI_LIMITS } from '@/features/ai-meal/constants';

export type MealTextValidation = { ok: true; text: string } | { ok: false; error: string };

export function normalizeMealText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateMealText(text: string): MealTextValidation {
  const normalized = normalizeMealText(text);
  if (normalized.length === 0) {
    return { ok: false, error: 'Describe what you ate.' };
  }
  if (normalized.length < AI_LIMITS.minTextLength) {
    return { ok: false, error: 'Add a few more words about the meal.' };
  }
  if (normalized.length > AI_LIMITS.maxTextLength) {
    return { ok: false, error: `Use ${AI_LIMITS.maxTextLength} characters or fewer.` };
  }
  return { ok: true, text: normalized };
}
