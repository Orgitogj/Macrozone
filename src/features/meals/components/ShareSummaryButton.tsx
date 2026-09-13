import { Alert, Share } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';

type ShareSummaryButtonProps = {
  summaryText: string;
  disabled?: boolean;
};

export function ShareSummaryButton({
  summaryText,
  disabled = false,
}: ShareSummaryButtonProps) {
  const handleShare = async () => {
    try {
      await Share.share({ message: summaryText });
    } catch {
      Alert.alert('Error', 'Could not open the share sheet. Please try again.');
    }
  };

  return (
    <IconButton
      icon='share-outline'
      onPress={handleShare}
      disabled={disabled}
      accessibilityLabel='Share summary'
      accessibilityHint='Shares this day’s macro summary'
    />
  );
}
