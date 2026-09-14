export type DecimalInputResult =
  | { kind: 'empty' }
  | { kind: 'number'; value: number }
  | { kind: 'negative' }
  | { kind: 'tooManyDecimals' }
  | { kind: 'invalid' };

const DECIMAL_PATTERN = /^(\d+)?(?:[.,](\d*))?$/;

export function parseDecimalInput(
  text: string,
  maxDecimalPlaces: number,
): DecimalInputResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { kind: 'empty' };
  }
  if (trimmed.startsWith('-')) {
    return DECIMAL_PATTERN.test(trimmed.slice(1)) && /\d/.test(trimmed)
      ? { kind: 'negative' }
      : { kind: 'invalid' };
  }
  const match = DECIMAL_PATTERN.exec(trimmed);
  if (!match || !/\d/.test(trimmed)) {
    return { kind: 'invalid' };
  }
  const fraction = match[2] ?? '';
  if (fraction.length > maxDecimalPlaces) {
    return { kind: 'tooManyDecimals' };
  }
  const value = Number(`${match[1] ?? '0'}.${fraction || '0'}`);
  return Number.isFinite(value) ? { kind: 'number', value } : { kind: 'invalid' };
}

export function formatNumberForInput(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}
