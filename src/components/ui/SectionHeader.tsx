import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

type SectionHeaderProps = {
  title: string;
  detail?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, detail, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.texts} accessible accessibilityRole='header' accessibilityLabel={detail ? `${title}, ${detail}` : title}>
        <AppText variant='subheading'>{title}</AppText>
        {detail ? (
          <AppText variant='caption' tone='secondary'>
            {detail}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
});
