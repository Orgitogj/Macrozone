import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

type KeyValueRowProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export function KeyValueRow({ label, value, emphasis = false }: KeyValueRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant={emphasis ? 'bodyStrong' : 'label'} tone={emphasis ? 'primary' : 'secondary'} style={styles.label}>
        {label}
      </AppText>
      <AppText variant={emphasis ? 'bodyStrong' : 'label'} align='right' style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: spacing.xxs,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    flexShrink: 1,
    marginLeft: 'auto',
  },
});
