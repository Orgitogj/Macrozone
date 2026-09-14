import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import { GoalsOverview } from '@/features/nutrition-goals/components/GoalsOverview';
import { ESTIMATE_DISCLAIMER } from '@/features/nutrition-goals/constants';
import { useGoalsNavigation } from '@/features/nutrition-goals/hooks/useGoalsNavigation';
import { useNutritionPlan } from '@/features/nutrition-goals/hooks/useNutritionPlan';
import { AppearanceSettings } from '@/features/settings';
import { spacing } from '@/theme';

export function NutritionGoalsScreen() {
  const { resource, retry } = useNutritionPlan();
  const navigation = useGoalsNavigation();

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        {resource.status === 'loading' ? <AppLoader accessibilityLabel='Loading nutrition goals' /> : null}
        {resource.status === 'error' ? <ErrorState message={resource.message} onRetry={retry} /> : null}
        {resource.status === 'ready' ? (
          <>
            {resource.refreshError ? (
              <NoticeCard tone='warning' message={resource.refreshError}>
                <TextButton label='Try again' size='small' onPress={retry} />
              </NoticeCard>
            ) : null}
            <GoalsOverview plan={resource.data} />
            <View style={styles.actions}>
              <AppButton
                label={resource.data.profile ? 'Recalculate Targets' : 'Calculate Targets'}
                onPress={navigation.openCalculator}
                accessibilityHint='Estimates targets from your details'
              />
              <AppButton label='Edit Targets Manually' variant='secondary' onPress={navigation.openManualEditor} />
            </View>
            <NoticeCard message={ESTIMATE_DISCLAIMER} />
          </>
        ) : null}
        <AppearanceSettings />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  actions: {
    gap: spacing.md,
  },
});
