import { Buffer } from 'node:buffer';

import { CONTRACT_VERSION, IMAGE_MEDIA_TYPES, LIMITS, type AnalysisRequest, type ImageMediaType } from '../contract.ts';

export type RequestValidationResult =
  | { ok: true; request: AnalysisRequest; imageBytes: number }
  | { ok: false; code: 'INVALID_INPUT' | 'INVALID_IMAGE'; message: string };

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeMealText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isImageMediaType(value: unknown): value is ImageMediaType {
  return typeof value === 'string' && (IMAGE_MEDIA_TYPES as readonly string[]).includes(value);
}

export function detectImageMediaType(bytes: Uint8Array): ImageMediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF' &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function parseAnalysisRequest(value: unknown): RequestValidationResult {
  if (!isRecord(value) || value.version !== CONTRACT_VERSION) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Unsupported request version.' };
  }
  if (value.inputKind === 'text') {
    if (typeof value.text !== 'string' || value.text.length > LIMITS.maxTextLength * 4) {
      return { ok: false, code: 'INVALID_INPUT', message: 'Describe the meal in a few words.' };
    }
    const text = normalizeMealText(value.text);
    if (text.length < LIMITS.minTextLength) {
      return { ok: false, code: 'INVALID_INPUT', message: 'Describe the meal in a few words.' };
    }
    if (text.length > LIMITS.maxTextLength) {
      return { ok: false, code: 'INVALID_INPUT', message: `Use ${LIMITS.maxTextLength} characters or fewer.` };
    }
    return { ok: true, request: { version: CONTRACT_VERSION, inputKind: 'text', text }, imageBytes: 0 };
  }
  if (value.inputKind === 'photo') {
    const image = value.image;
    if (!isRecord(image) || !isImageMediaType(image.mediaType) || typeof image.base64 !== 'string') {
      return { ok: false, code: 'INVALID_IMAGE', message: 'Use a JPEG, PNG, or WebP photo.' };
    }
    const base64 = image.base64;
    const maxBase64Length = Math.ceil(LIMITS.maxImageBytes / 3) * 4;
    if (base64.length === 0 || base64.length > maxBase64Length) {
      return { ok: false, code: 'INVALID_IMAGE', message: 'The photo is too large.' };
    }
    if (base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) {
      return { ok: false, code: 'INVALID_IMAGE', message: 'The photo data is not valid.' };
    }
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length === 0 || bytes.length > LIMITS.maxImageBytes) {
      return { ok: false, code: 'INVALID_IMAGE', message: 'The photo is too large.' };
    }
    if (detectImageMediaType(bytes) !== image.mediaType) {
      return { ok: false, code: 'INVALID_IMAGE', message: 'The photo type does not match its contents.' };
    }
    let note: string | null = null;
    if (value.note !== undefined && value.note !== null) {
      if (typeof value.note !== 'string' || value.note.length > LIMITS.maxPhotoNoteLength * 4) {
        return { ok: false, code: 'INVALID_INPUT', message: 'The note could not be read.' };
      }
      const normalizedNote = normalizeMealText(value.note);
      if (normalizedNote.length > LIMITS.maxPhotoNoteLength) {
        return { ok: false, code: 'INVALID_INPUT', message: 'Keep the note to ' + LIMITS.maxPhotoNoteLength + ' characters or fewer.' };
      }
      note = normalizedNote.length > 0 ? normalizedNote : null;
    }
    return {
      ok: true,
      request: { version: CONTRACT_VERSION, inputKind: 'photo', image: { mediaType: image.mediaType, base64 }, note },
      imageBytes: bytes.length,
    };
  }
  return { ok: false, code: 'INVALID_INPUT', message: 'Choose text or a photo to analyze.' };
}
