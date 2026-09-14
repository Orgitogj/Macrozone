import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { GoalsOverview } from '@/features/nutrition-goals/components/GoalsOverview';
import { ESTIMATE_DISCLAIMER } from '@/features/nutrition-goals/constants';
import { useGoalsNavigation } from '@/features/nutrition-goals/hooks/useGoalsNavigation';
import { useNutritionPlan } from '@/features/nutrition-goals/hooks/useNutritionPlan';

export function NutritionGoalsScreen() {
  const { state, retry } = useNutritionPlan();
  const navigation = useGoalsNavigation();

  return (
    <FormScreen>
      {state.status === 'loading' ? <AppLoader accessibilityLabel='Loading nutrition goals' /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ready' ? (
        <View style={styles.content}>
          <GoalsOverview plan={state.plan} />
          <View style={styles.actions}>
            <AppButton
              label={state.plan.profile ? 'Recalculate Targets' : 'Calculate Targets'}
              onPress={navigation.openCalculator}
              accessibilityHint='Estimates targets from your details'
            />
            <AppButton
              label='Edit Targets Manually'
              variant='secondary'
              onPress={navigation.openManualEditor}
            />
          </View>
          <NoticeCard message={ESTIMATE_DISCLAIMER} />
        </View>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
  },
  actions: {
    gap: 12,
  },
});
