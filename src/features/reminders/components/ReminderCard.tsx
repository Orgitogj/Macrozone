import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppSwitch } from '@/components/ui/AppSwitch';
import { AppText } from '@/components/ui/AppText';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { TextButton } from '@/components/ui/TextButton';
import type { ReminderCardModel } from '@/features/reminders/utils/reminderCards';
import { spacing } from '@/theme';

type ReminderCardProps = {
  reminder: ReminderCardModel;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
  onChangeTime: (selected: Date) => void;
};

export function ReminderCard({ reminder, disabled, onToggle, onChangeTime }: ReminderCardProps) {
  const controlsDisabled = disabled || reminder.isPending;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText variant='subheading' accessibilityRole='header'>
            {reminder.label}
          </AppText>
          <AppText
            variant='caption'
            tone={reminder.statusTone}
            accessibilityLiveRegion='polite'
            accessibilityLabel={`${reminder.label} reminder status: ${reminder.statusText}`}
          >
            {reminder.statusText}
          </AppText>
        </View>
        <AppSwitch
          value={reminder.enabled}
          onValueChange={onToggle}
          disabled={controlsDisabled}
          accessibilityLabel={`${reminder.label} reminder`}
          accessibilityHint={
            reminder.enabled
              ? `Turns off the daily ${reminder.label.toLowerCase()} reminder`
              : `Turns on a daily ${reminder.label.toLowerCase()} reminder at ${reminder.timeLabel}`
          }
        />
      </View>

      <DateTimePickerField
        mode='time'
        value={reminder.timeValue}
        displayValue={reminder.timeLabel}
        onChange={onChangeTime}
        disabled={controlsDisabled}
        accessibilityLabel={`${reminder.label} reminder time`}
        accessibilityHint='Opens a time picker to change when this reminder is sent'
      />

      {reminder.problem ? (
        <View style={styles.problem} accessibilityRole='alert'>
          <AppText variant='caption' tone='danger'>
            {reminder.problem.message}
          </AppText>
          {reminder.problem.retry ? (
            <TextButton
              label='Try again'
              size='small'
              onPress={reminder.problem.retry}
              disabled={disabled}
              accessibilityLabel={`Try again for the ${reminder.label.toLowerCase()} reminder`}
            />
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    gap: spacing.xxs,
  },
  problem: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
});
