import { LIBRARY_LIMITS } from '@/features/library/constants';
import { parseDecimalInput } from '@/utils/numberInput';

export type AmountRule = {
  label: string;
  required: boolean;
  allowZero: boolean;
  max: number;
  formatMax: (value: number) => string;
};

export type AmountResult = { ok: true; value: number } | { ok: false; error: string };

export function parseLibraryAmount(text: string, rule: AmountRule): AmountResult {
  const result = parseDecimalInput(text, LIBRARY_LIMITS.maxDecimalPlaces);
  switch (result.kind) {
    case 'empty':
      return rule.required ? { ok: false, error: `${rule.label} is required.` } : { ok: true, value: 0 };
    case 'negative':
      return { ok: false, error: `${rule.label} can't be negative.` };
    case 'tooManyDecimals':
      return {
        ok: false,
        error: `Use a number with up to ${LIBRARY_LIMITS.maxDecimalPlaces} decimal places, without thousands separators.`,
      };
    case 'invalid':
      return { ok: false, error: 'Enter a number, for example 12.5.' };
    case 'number':
      if (!rule.allowZero && result.value <= 0) {
        return { ok: false, error: `${rule.label} must be greater than zero.` };
      }
      if (result.value > rule.max) {
        return { ok: false, error: `${rule.label} must be at most ${rule.formatMax(rule.max)}.` };
      }
      return { ok: true, value: result.value };
  }
}
