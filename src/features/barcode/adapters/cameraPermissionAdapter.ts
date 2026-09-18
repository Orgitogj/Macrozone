import { Camera } from 'expo-camera';
import { Linking, Platform } from 'react-native';

export type CameraPermissionResult = { status: 'granted' } | { status: 'denied'; canAskAgain: boolean } | { status: 'unavailable' };

export type CameraAdapter = {
  isScanningSupported(): boolean;
  requestPermission(): Promise<CameraPermissionResult>;
  openSettings(): Promise<void>;
};

export function createCameraAdapter(): CameraAdapter {
  return {
    isScanningSupported: () => Platform.OS === 'android' || Platform.OS === 'ios',
    requestPermission: async () => {
      if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return { status: 'unavailable' };
      }
      try {
        const response = await Camera.requestCameraPermissionsAsync();
        return response.granted ? { status: 'granted' } : { status: 'denied', canAskAgain: response.canAskAgain };
      } catch {
        return { status: 'unavailable' };
      }
    },
    openSettings: async () => {
      try {
        await Linking.openSettings();
      } catch {
        return;
      }
    },
  };
}

export async function openHttpsUrl(url: string): Promise<boolean> {
  if (!/^https:\/\/[A-Za-z0-9.-]+(\/[A-Za-z0-9._~/%-]*)?$/.test(url)) {
    return false;
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
