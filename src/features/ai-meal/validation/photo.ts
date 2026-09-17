import { AI_LIMITS, AI_SOURCE_PHOTO_MIME_TYPES } from '@/features/ai-meal/constants';

export function isSupportedSourcePhoto({ mimeType, type }: { mimeType?: string | null; type?: string | null }): boolean {
  if (type !== undefined && type !== null && type !== 'image') {
    return false;
  }
  if (mimeType === undefined || mimeType === null || mimeType === '') {
    return true;
  }
  return (AI_SOURCE_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function computeResizeTarget(
  width: number,
  height: number,
  maxDimension: number,
): { width: number } | { height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxDimension };
  }
  if (width <= maxDimension && height <= maxDimension) {
    return null;
  }
  return width >= height ? { width: maxDimension } : { height: maxDimension };
}

export function decodedBase64Length(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function isEncodedPhotoWithinLimit(base64: string): boolean {
  const bytes = decodedBase64Length(base64);
  return base64.length > 0 && base64.length % 4 === 0 && bytes > 0 && bytes <= AI_LIMITS.maxImageBytes;
}

export function isJpegBase64(base64: string): boolean {
  return base64.startsWith('/9j/');
}
