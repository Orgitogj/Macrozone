import { BARCODE_LIMITS, SCANNER_BARCODE_TYPES } from '@/features/barcode/constants';

export type GtinFormat = 'EAN-8' | 'UPC-A' | 'EAN-13' | 'GTIN-14';

export type BarcodeFailureReason =
  | 'empty'
  | 'too_long'
  | 'not_a_product_barcode'
  | 'invalid_characters'
  | 'unsupported_length'
  | 'invalid_check_digit'
  | 'unsupported_scanner_type';

export type NormalizedBarcode = {
  barcode: string;
  inputDigits: string;
  format: GtinFormat;
};

export type BarcodeNormalization = { ok: true; value: NormalizedBarcode } | { ok: false; reason: BarcodeFailureReason };

const FORMAT_BY_LENGTH: Readonly<Record<number, GtinFormat>> = {
  8: 'EAN-8',
  12: 'UPC-A',
  13: 'EAN-13',
  14: 'GTIN-14',
};

const DIGITS_ONLY = /^[0-9]+$/;

const DIGIT_GROUPS = /^[0-9]+(?:[ -][0-9]+)*$/;

const TEXT_PAYLOAD = /[a-z]{2,}:|\/\/|www\.|@/i;

export function computeGs1CheckDigit(digitsWithoutCheck: string): number {
  if (!DIGITS_ONLY.test(digitsWithoutCheck)) {
    throw new RangeError('A GS1 check digit needs digits only.');
  }
  let sum = 0;
  for (let offset = 0; offset < digitsWithoutCheck.length; offset += 1) {
    const digit = digitsWithoutCheck.charCodeAt(digitsWithoutCheck.length - 1 - offset) - 48;
    sum += digit * (offset % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function hasValidGs1CheckDigit(digits: string): boolean {
  if (!DIGITS_ONLY.test(digits) || digits.length < 2) {
    return false;
  }
  return computeGs1CheckDigit(digits.slice(0, -1)) === digits.charCodeAt(digits.length - 1) - 48;
}

export function canonicalizeForOpenFoodFacts(digits: string): string {
  const withoutLeadingZeros = digits.replace(/^0+/, '');
  if (withoutLeadingZeros.length <= 7) {
    return withoutLeadingZeros.padStart(8, '0');
  }
  if (withoutLeadingZeros.length >= 9 && withoutLeadingZeros.length <= 12) {
    return withoutLeadingZeros.padStart(13, '0');
  }
  return withoutLeadingZeros;
}

function normalizeDigits(digits: string): BarcodeNormalization {
  const format = FORMAT_BY_LENGTH[digits.length];
  if (format === undefined) {
    return { ok: false, reason: 'unsupported_length' };
  }
  if (/^0+$/.test(digits) || !hasValidGs1CheckDigit(digits)) {
    return { ok: false, reason: 'invalid_check_digit' };
  }
  return { ok: true, value: { barcode: canonicalizeForOpenFoodFacts(digits), inputDigits: digits, format } };
}

export function normalizeManualBarcode(raw: string): BarcodeNormalization {
  if (TEXT_PAYLOAD.test(raw.slice(0, 200))) {
    return { ok: false, reason: 'not_a_product_barcode' };
  }
  if (raw.length > BARCODE_LIMITS.maxManualInputLength) {
    return { ok: false, reason: 'too_long' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (!DIGIT_GROUPS.test(trimmed)) {
    return { ok: false, reason: 'invalid_characters' };
  }
  return normalizeDigits(trimmed.replace(/[ -]/g, ''));
}

export function isSupportedScannerType(type: string): boolean {
  return (SCANNER_BARCODE_TYPES as readonly string[]).includes(type);
}

export function normalizeScannedBarcode(type: string, data: string): BarcodeNormalization {
  if (!isSupportedScannerType(type)) {
    return { ok: false, reason: 'unsupported_scanner_type' };
  }
  if (data.length > BARCODE_LIMITS.maxManualInputLength) {
    return { ok: false, reason: 'too_long' };
  }
  if (!DIGITS_ONLY.test(data)) {
    return { ok: false, reason: TEXT_PAYLOAD.test(data) ? 'not_a_product_barcode' : 'invalid_characters' };
  }
  if (type === 'ean8' && data.length !== 8) {
    return { ok: false, reason: 'unsupported_length' };
  }
  if (type === 'itf14' && data.length !== 14) {
    return { ok: false, reason: 'unsupported_length' };
  }
  if ((type === 'ean13' || type === 'upc_a') && data.length !== 12 && data.length !== 13) {
    return { ok: false, reason: 'unsupported_length' };
  }
  return normalizeDigits(data);
}

export function isCanonicalBarcode(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{8,14}$/.test(value) && canonicalizeForOpenFoodFacts(value) === value;
}

export function describeBarcodeFailure(reason: BarcodeFailureReason): string {
  switch (reason) {
    case 'empty':
      return 'Enter the numbers under the barcode.';
    case 'too_long':
      return 'That is too long for a food barcode.';
    case 'not_a_product_barcode':
      return 'This looks like a link or text, not a food barcode. Scan the barcode on the package.';
    case 'invalid_characters':
      return 'Use only the digits printed under the barcode.';
    case 'unsupported_length':
      return 'Food barcodes have 8, 12, 13, or 14 digits.';
    case 'invalid_check_digit':
      return 'This barcode number is not valid. Check the digits and try again.';
    case 'unsupported_scanner_type':
      return 'This code type is not a supported food barcode.';
  }
}

export function formatBarcodeForSpeech(barcode: string): string {
  return barcode.split('').join(' ');
}
