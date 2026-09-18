import { StyleSheet } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { ConflictVersionView } from '@/features/account/utils/conflictPresentation';
import { spacing } from '@/theme';

type ConflictVersionCardProps = {
  title: string;
  detail: string;
  version: ConflictVersionView;
};

export function ConflictVersionCard({ title, detail, version }: ConflictVersionCardProps) {
  return (
    <AppCard style={styles.card}>
      <SectionHeader title={title} detail={detail} />
      {version.kind === 'deleted' ? (
        <AppText variant='body' tone='secondary'>
          This version deletes the item.
        </AppText>
      ) : null}
      {version.kind === 'unreadable' ? (
        <AppText variant='body' tone='secondary'>
          MacroZone cannot read this version. It was probably saved by a newer version of the app.
        </AppText>
      ) : null}
      {version.kind === 'values'
        ? version.rows.map((row) => <KeyValueRow key={row.label} label={row.label} value={row.value} />)
        : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
});
