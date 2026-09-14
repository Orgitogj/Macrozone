import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { TextButton } from '@/components/ui/TextButton';
import { spacing } from '@/theme';

type DailySummaryActionsProps = {
  summaryText: string;
  disabled?: boolean;
};

export function DailySummaryActions({ summaryText, disabled = false }: DailySummaryActionsProps) {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(summaryText);
    } catch {
      Alert.alert('Error', 'Could not copy the summary. Please try again.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Daily summary copied to the clipboard.');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: summaryText });
    } catch {
      Alert.alert('Error', 'Could not open the share sheet. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TextButton
        label='Copy summary'
        icon='copy-outline'
        tone='secondary'
        size='small'
        onPress={handleCopy}
        disabled={disabled}
        accessibilityHint="Copies this day's nutrition summary"
      />
      <TextButton
        label='Share summary'
        icon='share-outline'
        tone='secondary'
        size='small'
        onPress={handleShare}
        disabled={disabled}
        accessibilityHint="Shares this day's nutrition summary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.xxl,
    rowGap: spacing.sm,
  },
});
