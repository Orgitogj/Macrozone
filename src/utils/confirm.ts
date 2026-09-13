import { Alert } from 'react-native';

type ConfirmDestructiveActionOptions = {
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
