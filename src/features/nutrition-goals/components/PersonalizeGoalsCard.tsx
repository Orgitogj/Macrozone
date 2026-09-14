import { StyleSheet, View } from 'react-native';

import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';

type PersonalizeGoalsCardProps = {
  onSetUp: () => void;
  onDismiss: () => void;
};

export function PersonalizeGoalsCard({ onSetUp, onDismiss }: PersonalizeGoalsCardProps) {
  return (
    <NoticeCard
      title='Personalize your goals'
      message='You are using default targets. Calculate targets from your details or enter your own.'
      style={styles.card}
    >
      <View style={styles.actions}>
        <TextButton label='Set Up Goals' onPress={onSetUp} accessibilityHint='Opens the goal calculator' />
        <TextButton label='Not Now' onPress={onDismiss} accessibilityHint='Hides this suggestion' />
      </View>
    </NoticeCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
});
