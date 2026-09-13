import { StyleSheet } from 'react-native';

export const colors = {
  background: '#1a1a2e',
  header: '#242444',
  surface: '#2a2a4a',
  card: '#16213e',
  primary: '#4fc3f7',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  alert: '#ff5252',
  macroCalories: '#ff6b6b',
  macroProtein: '#4ecdc4',
  macroCarbs: '#ffd93d',
  macroFat: '#6bcb77',
};

export const MIN_TOUCH_TARGET = 44;

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 30,
    marginBottom: 16,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
