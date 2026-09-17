import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';

import { AI_PHOTO_ATTEMPTS } from '@/features/ai-meal/constants';
import type { PreparedPhoto } from '@/features/ai-meal/types';
import { buildOwnedDirectoryUri, createOwnedTempFiles, type OwnedTempFiles } from '@/features/ai-meal/utils/ownedTempFiles';
import {
  computeResizeTarget,
  decodedBase64Length,
  isEncodedPhotoWithinLimit,
  isJpegBase64,
  isSupportedSourcePhoto,
} from '@/features/ai-meal/validation/photo';

export type PhotoSource = 'camera' | 'library';

export type PhotoPickResult =
  | { status: 'picked'; photo: PreparedPhoto }
  | { status: 'cancelled' }
  | { status: 'permission_denied'; canAskAgain: boolean }
  | { status: 'invalid'; message: string }
  | { status: 'failed'; message: string };

export type PhotoAdapter = {
  pick(source: PhotoSource): Promise<PhotoPickResult>;
  discard(uri: string): void;
  openSettings(): Promise<boolean>;
  isCameraAvailable(): boolean;
};

function resolveOwnedDirectoryUri(): string | null {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    return buildOwnedDirectoryUri(Paths.cache.uri);
  } catch {
    return null;
  }
}

function removeFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}

async function preparePhoto(asset: ImagePicker.ImagePickerAsset, ownedFiles: OwnedTempFiles): Promise<PhotoPickResult> {
  for (const attempt of AI_PHOTO_ATTEMPTS) {
    const context = ImageManipulator.manipulate(asset.uri);
    try {
      const target = computeResizeTarget(asset.width, asset.height, attempt.maxDimension);
      if (target) {
        context.resize(target);
      }
      const image = await context.renderAsync();
      try {
        const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: attempt.compress, base64: true });
        ownedFiles.track(saved.uri);
        const base64 = saved.base64 ?? '';
        if (isEncodedPhotoWithinLimit(base64) && isJpegBase64(base64)) {
          return {
            status: 'picked',
            photo: {
              uri: saved.uri,
              base64,
              mediaType: 'image/jpeg',
              width: saved.width,
              height: saved.height,
              byteLength: decodedBase64Length(base64),
            },
          };
        }
        ownedFiles.release(saved.uri);
      } finally {
        image.release();
      }
    } finally {
      context.release();
    }
  }
  return { status: 'invalid', message: 'This photo is too large to analyze. Try another photo.' };
}

export function createPhotoAdapter(
  ownedFiles: OwnedTempFiles = createOwnedTempFiles({ ownedDirectoryUri: resolveOwnedDirectoryUri(), removeFile }),
): PhotoAdapter {
  return {
    isCameraAvailable: () => Platform.OS !== 'web',

    pick: async (source) => {
      try {
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            return { status: 'permission_denied', canAskAgain: permission.canAskAgain };
          }
        }
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'],
          allowsEditing: false,
          allowsMultipleSelection: false,
          exif: false,
          base64: false,
          quality: 1,
        };
        const result =
          source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled) {
          return { status: 'cancelled' };
        }
        const asset = result.assets[0];
        if (!asset) {
          return { status: 'cancelled' };
        }
        if (!isSupportedSourcePhoto({ mimeType: asset.mimeType, type: asset.type })) {
          return { status: 'invalid', message: 'Choose a JPEG, PNG, HEIC, or WebP photo.' };
        }
        return await preparePhoto(asset, ownedFiles);
      } catch {
        return { status: 'failed', message: 'The photo could not be prepared. Try again or choose another photo.' };
      }
    },

    discard: (uri) => ownedFiles.release(uri),

    openSettings: async () => {
      try {
        await Linking.openSettings();
        return true;
      } catch {
        return false;
      }
    },
  };
}
