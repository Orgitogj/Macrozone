import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppButton } from '@/components/ui/AppButton';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { GoalCalculatorFlow } from '@/features/nutrition-goals/components/GoalCalculatorFlow';
import { GoalTargetsEditor } from '@/features/nutrition-goals/components/GoalTargetsEditor';
import { DEFAULT_DAILY_GOALS, ESTIMATE_DISCLAIMER } from '@/features/nutrition-goals/constants';
import {
  getNutritionPlanErrorMessage,
  saveManualGoals,
  skipGoalSetup,
} from '@/features/nutrition-goals/services/nutritionPlanActions';
import { useOnboardingGate } from '@/features/onboarding/OnboardingGateProvider';
import { spacing } from '@/theme';
import { createSingleFlight } from '@/utils/singleFlight';

type OnboardingMode = 'welcome' | 'calculate' | 'manual';

export function OnboardingScreen() {
  const { refresh } = useOnboardingGate();
  const [mode, setMode] = useState<OnboardingMode>('welcome');
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipFlight] = useState(createSingleFlight);

  useEffect(() => {
    if (mode === 'welcome') {
      return undefined;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode('welcome');
      return true;
    });
    return () => subscription.remove();
  }, [mode]);

  const finish = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void refresh();
  };

  const skip = () =>
    skipFlight.run(async () => {
      setIsSkipping(true);
      try {
        await skipGoalSetup();
        await refresh();
      } catch (error) {
        Alert.alert('Error', getNutritionPlanErrorMessage(error, 'Could not continue. Please try again.'));
      } finally {
        setIsSkipping(false);
      }
    });

  if (mode === 'calculate') {
    return (
      <ScrollScreen edges={['top', 'bottom']}>
        <ScreenHeader title='Set Up Your Goals' />
        <GoalCalculatorFlow
          initialProfile={null}
          exitLabel='Back'
          onExit={() => setMode('welcome')}
          onSaved={finish}
        />
      </ScrollScreen>
    );
  }

  if (mode === 'manual') {
    return (
      <ScrollScreen edges={['top', 'bottom']}>
        <ScreenHeader title='Enter Your Goals' />
        <View style={styles.content}>
          <AppText variant='body' tone='secondary'>
            Enter the daily targets you want to track. You can change them any time.
          </AppText>
          <GoalTargetsEditor
            initialGoals={DEFAULT_DAILY_GOALS}
            submitLabel='Save Targets'
            onSave={(goals) => saveManualGoals(goals)}
            onSaved={finish}
            secondaryAction={<AppButton label='Back' variant='secondary' onPress={() => setMode('welcome')} />}
          />
        </View>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen edges={['top', 'bottom']}>
      <ScreenHeader title='Welcome to MacroZone' />
      <View style={styles.content}>
        <AppText variant='body' tone='secondary'>
          Set daily calorie and macro targets so your progress means something. MacroZone can estimate targets
          from a few details, or you can enter your own.
        </AppText>
        <NoticeCard message={ESTIMATE_DISCLAIMER} />
        <View style={styles.actions}>
          <AppButton
            label='Calculate My Goals'
            onPress={() => setMode('calculate')}
            disabled={isSkipping}
            accessibilityHint='Asks a few questions to estimate your targets'
          />
          <AppButton
            label='Enter Goals Manually'
            variant='secondary'
            onPress={() => setMode('manual')}
            disabled={isSkipping}
          />
          <AppButton
            label='Skip for Now'
            variant='secondary'
            onPress={skip}
            loading={isSkipping}
            accessibilityHint='Uses default targets. You can set goals later from Home.'
          />
        </View>
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
