import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { GoalTargetsEditor } from '@/features/nutrition-goals/components/GoalTargetsEditor';
import { ESTIMATE_DISCLAIMER } from '@/features/nutrition-goals/constants';
import { useGoalsNavigation } from '@/features/nutrition-goals/hooks/useGoalsNavigation';
import { useNutritionPlan } from '@/features/nutrition-goals/hooks/useNutritionPlan';
import { saveManualGoals } from '@/features/nutrition-goals/services/nutritionPlanActions';
import { getEffectiveGoals } from '@/features/nutrition-goals/utils/goalProgress';
import { spacing } from '@/theme';

export function ManualGoalsScreen() {
  const { resource, retry } = useNutritionPlan();
  const navigation = useGoalsNavigation();

  return (
    <ScrollScreen edges={['bottom']}>
      {resource.status === 'loading' ? <AppLoader accessibilityLabel='Loading nutrition goals' /> : null}
      {resource.status === 'error' ? <ErrorState message={resource.message} onRetry={retry} /> : null}
      {resource.status === 'ready' ? (
        <View style={styles.content}>
          <NoticeCard message={ESTIMATE_DISCLAIMER} />
          <GoalTargetsEditor
            initialGoals={getEffectiveGoals(resource.data)}
            submitLabel='Save Targets'
            onSave={(goals) => saveManualGoals(goals)}
            onSaved={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.close();
            }}
            secondaryAction={<AppButton label='Cancel' variant='secondary' onPress={navigation.close} />}
          />
        </View>
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
});
