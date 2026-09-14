import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing, useTheme } from '@/theme';
import {
  cancelMealReminders,
  requestPermissions,
  scheduleMealReminders,
} from '@/utils/notifications';

const REMINDERS_KEY = 'remindersEnabled';

export default function ReminderToggle() {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const val = await AsyncStorage.getItem(REMINDERS_KEY);
      setEnabled(val === 'true');
    };
    load();
  }, []);

  const toggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) return;
      await scheduleMealReminders();
    } else {
      await cancelMealReminders();
    }
    setEnabled(value);
    await AsyncStorage.setItem(REMINDERS_KEY, value.toString());
  };

  return (
    <View style={styles.container}>
      <AppText variant='body'>Meal Reminders</AppText>
      <Switch
        value={enabled}
        onValueChange={toggle}
        trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
});