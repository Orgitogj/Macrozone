import * as Haptics from 'expo-haptics';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { GoalCalculatorFlow } from '@/features/nutrition-goals/components/GoalCalculatorFlow';
import { useGoalsNavigation } from '@/features/nutrition-goals/hooks/useGoalsNavigation';
import { useNutritionPlan } from '@/features/nutrition-goals/hooks/useNutritionPlan';

export function GoalCalculatorScreen() {
  const { resource, retry } = useNutritionPlan();
  const navigation = useGoalsNavigation();

  return (
    <ScrollScreen edges={['bottom']}>
      {resource.status === 'loading' ? <AppLoader accessibilityLabel='Loading your details' /> : null}
      {resource.status === 'error' ? <ErrorState message={resource.message} onRetry={retry} /> : null}
      {resource.status === 'ready' ? (
        <GoalCalculatorFlow
          initialProfile={resource.data.profile}
          exitLabel='Cancel'
          onExit={navigation.close}
          onSaved={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.close();
          }}
        />
      ) : null}
    </ScrollScreen>
  );
}
