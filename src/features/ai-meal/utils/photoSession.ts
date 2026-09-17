import type { PreparedPhoto } from '@/features/ai-meal/types';

export type PhotoSession = {
  current(): PreparedPhoto | null;
  accept(photo: PreparedPhoto): boolean;
  clear(): void;
  dispose(): void;
  isDisposed(): boolean;
};

export function createPhotoSession(discard: (uri: string) => void): PhotoSession {
  let photo: PreparedPhoto | null = null;
  let disposed = false;

  const safeDiscard = (uri: string) => {
    try {
      discard(uri);
    } catch {
      return;
    }
  };

  return {
    current: () => photo,
    accept: (next) => {
      if (disposed) {
        safeDiscard(next.uri);
        return false;
      }
      if (photo !== null && photo.uri !== next.uri) {
        safeDiscard(photo.uri);
      }
      photo = next;
      return true;
    },
    clear: () => {
      if (photo !== null) {
        safeDiscard(photo.uri);
        photo = null;
      }
    },
    dispose: () => {
      if (photo !== null) {
        safeDiscard(photo.uri);
        photo = null;
      }
      disposed = true;
    },
    isDisposed: () => disposed,
  };
}
