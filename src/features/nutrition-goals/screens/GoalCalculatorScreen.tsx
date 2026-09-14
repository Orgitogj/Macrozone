import * as Haptics from 'expo-haptics';

import { FormScreen } from '@/components/layout/FormScreen';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { GoalCalculatorFlow } from '@/features/nutrition-goals/components/GoalCalculatorFlow';
import { useGoalsNavigation } from '@/features/nutrition-goals/hooks/useGoalsNavigation';
import { useNutritionPlan } from '@/features/nutrition-goals/hooks/useNutritionPlan';

export function GoalCalculatorScreen() {
  const { state, retry } = useNutritionPlan();
  const navigation = useGoalsNavigation();

  return (
    <FormScreen>
      {state.status === 'loading' ? <AppLoader accessibilityLabel='Loading your details' /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ready' ? (
        <GoalCalculatorFlow
          initialProfile={state.plan.profile}
          exitLabel='Cancel'
          onExit={navigation.close}
          onSaved={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.close();
          }}
        />
      ) : null}
    </FormScreen>
  );
}
