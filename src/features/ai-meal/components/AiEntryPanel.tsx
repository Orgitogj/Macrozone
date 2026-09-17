import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { AI_ESTIMATE_NOTICE } from '@/features/ai-meal/constants';
import { useAiMealAvailability, useAiMealNavigation } from '@/features/ai-meal/hooks/useAiMealNavigation';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { spacing } from '@/theme';

type AiEntryPanelProps = {
  destination: LogDestination;
  onLogManually: () => void;
};

export function AiEntryPanel({ destination, onLogManually }: AiEntryPanelProps) {
  const isConfigured = useAiMealAvailability();
  const navigation = useAiMealNavigation();

  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <AppText variant='subheading' accessibilityRole='header'>
          Estimate with AI
        </AppText>
        <AppText variant='body' tone='secondary'>
          Describe a meal or use a photo to get an estimate. You review and edit everything before it is added.
        </AppText>
        <AppText variant='caption' tone='muted'>
          {AI_ESTIMATE_NOTICE}
        </AppText>
        {isConfigured ? (
          <View style={styles.actions}>
            <AppButton
              label='Describe a Meal'
              onPress={() => navigation.openAiMeal(destination, 'text')}
              accessibilityHint='Opens the AI estimate screen with a text description'
            />
            <AppButton
              label='Use a Photo'
              variant='secondary'
              onPress={() => navigation.openAiMeal(destination, 'photo')}
              accessibilityHint='Opens the AI estimate screen with a meal photo'
            />
          </View>
        ) : (
          <NoticeCard
            tone='info'
            title='AI estimates are not set up'
            message='This version of MacroZone is not connected to an AI service. You can still log meals manually or from your library.'
          />
        )}
      </AppCard>
      <TextButton label='Log Manually Instead' onPress={onLogManually} accessibilityHint='Shows the manual meal form' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
