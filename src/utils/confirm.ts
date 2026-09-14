import { Alert, Platform } from 'react-native';

export type ConfirmDestructiveActionOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
};

export function confirmDestructiveAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
}: ConfirmDestructiveActionOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(webConfirm ? webConfirm(`${title}\n\n${message}`) : false);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
