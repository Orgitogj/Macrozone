import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors } from '@/styles/global';

type CopySummaryButtonProps = {
  summaryText: string;
  disabled?: boolean;
};

export function CopySummaryButton({
  summaryText,
  disabled = false,
}: CopySummaryButtonProps) {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(summaryText);
    } catch {
      Alert.alert('Error', 'Could not copy the summary. Please try again.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Macro summary copied to clipboard.');
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={handleCopy}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel='Copy summary'
      accessibilityHint='Copies this day’s macro summary to the clipboard'
      accessibilityState={{ disabled }}
    >
      <Ionicons name='copy-outline' size={18} color={colors.primary} />
      <Text style={styles.text}>Copy Summary</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.primary,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.3,
  },
});
