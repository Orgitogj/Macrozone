import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { colors } from '@/styles/global';

type DateNavigatorProps = {
  title: string;
  subtitle?: string;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  onToday?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function DateNavigator({
  title,
  subtitle,
  onPrevious,
  onNext,
  canGoNext,
  onToday,
  style,
}: DateNavigatorProps) {
  return (
    <View style={[styles.container, style]}>
      <IconButton
        icon='chevron-back'
        onPress={onPrevious}
        accessibilityLabel='Previous day'
      />
      <View
        style={styles.labels}
        accessible
        accessibilityLiveRegion='polite'
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onToday ? (
        <TextButton
          label='Today'
          onPress={onToday}
          accessibilityHint='Shows today'
          style={styles.todayButton}
        />
      ) : null}
      <IconButton
        icon='chevron-forward'
        onPress={onNext}
        disabled={!canGoNext}
        accessibilityLabel='Next day'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 30,
  },
  labels: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  todayButton: {
    paddingHorizontal: 4,
  },
});
