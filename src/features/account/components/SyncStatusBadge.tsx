import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { SyncStatusKind } from '@/features/sync/utils/syncStatus';
import { iconSizes, spacing, useTheme, type ThemeColors } from '@/theme';

type SyncStatusBadgeProps = {
  kind: SyncStatusKind;
  label: string;
};

const ICONS: Readonly<Record<SyncStatusKind, keyof typeof Ionicons.glyphMap>> = {
  not_configured: 'information-circle-outline',
  local_only: 'phone-portrait-outline',
  up_to_date: 'checkmark-circle-outline',
  changes_waiting: 'time-outline',
  syncing: 'sync-outline',
  offline: 'cloud-offline-outline',
  attention_required: 'alert-circle-outline',
  sign_in_required: 'log-in-outline',
};

const TONES: Readonly<Record<SyncStatusKind, keyof ThemeColors>> = {
  not_configured: 'textSecondary',
  local_only: 'textSecondary',
  up_to_date: 'success',
  changes_waiting: 'textSecondary',
  syncing: 'primary',
  offline: 'textSecondary',
  attention_required: 'warning',
  sign_in_required: 'warning',
};

export function SyncStatusBadge({ kind, label }: SyncStatusBadgeProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row} accessible accessibilityRole='text' accessibilityLabel={`Backup status: ${label}`}>
      <Ionicons name={ICONS[kind]} size={iconSizes.md} color={colors[TONES[kind]]} />
      <AppText variant='subheading'>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
});
