export const PROCESSED_PHOTO_DIRECTORY_NAME = 'ImageManipulator';

const PROCESSED_PHOTO_FILE_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\.jpe?g$/;

export function buildOwnedDirectoryUri(cacheDirectoryUri: string | null): string | null {
  if (cacheDirectoryUri === null || !cacheDirectoryUri.startsWith('file:///') || /[?#\\%]|\/\.\.?(\/|$)/.test(cacheDirectoryUri)) {
    return null;
  }
  const base = cacheDirectoryUri.endsWith('/') ? cacheDirectoryUri : `${cacheDirectoryUri}/`;
  return `${base}${PROCESSED_PHOTO_DIRECTORY_NAME}/`;
}

export function isOwnedProcessedPhotoUri(uri: string, ownedDirectoryUri: string | null): boolean {
  if (ownedDirectoryUri === null || !uri.startsWith(ownedDirectoryUri)) {
    return false;
  }
  return PROCESSED_PHOTO_FILE_PATTERN.test(uri.slice(ownedDirectoryUri.length));
}

export type OwnedTempFiles = {
  track(uri: string): boolean;
  isTracked(uri: string): boolean;
  release(uri: string): void;
  releaseAll(): void;
};

export function createOwnedTempFiles({
  ownedDirectoryUri,
  removeFile,
}: {
  ownedDirectoryUri: string | null;
  removeFile: (uri: string) => void;
}): OwnedTempFiles {
  const tracked = new Set<string>();

  const release = (uri: string) => {
    if (!tracked.delete(uri) || !isOwnedProcessedPhotoUri(uri, ownedDirectoryUri)) {
      return;
    }
    try {
      removeFile(uri);
    } catch {
      return;
    }
  };

  return {
    track: (uri) => {
      if (!isOwnedProcessedPhotoUri(uri, ownedDirectoryUri)) {
        return false;
      }
      tracked.add(uri);
      return true;
    },
    isTracked: (uri) => tracked.has(uri),
    release,
    releaseAll: () => {
      for (const uri of [...tracked]) {
        release(uri);
      }
    },
  };
}
