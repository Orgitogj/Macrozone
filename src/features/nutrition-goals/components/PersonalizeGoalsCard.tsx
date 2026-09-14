import { StyleSheet, View } from 'react-native';

import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { spacing } from '@/theme';

type PersonalizeGoalsCardProps = {
  onSetUp: () => void;
  onDismiss: () => void;
};

export function PersonalizeGoalsCard({ onSetUp, onDismiss }: PersonalizeGoalsCardProps) {
  return (
    <NoticeCard
      title='Personalize your goals'
      message='You are using default targets. Estimate targets from your details or enter your own.'
    >
      <View style={styles.actions}>
        <TextButton label='Set Up Goals' size='small' onPress={onSetUp} accessibilityHint='Opens the goal calculator' />
        <TextButton label='Not Now' size='small' tone='secondary' onPress={onDismiss} accessibilityHint='Hides this suggestion' />
      </View>
    </NoticeCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
});
