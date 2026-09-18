import { StyleSheet, View } from 'react-native';

import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import type { ProviderFailureCode } from '@/features/barcode/types';
import { describeLookupFailure } from '@/features/barcode/utils/barcodeLabels';
import { spacing } from '@/theme';

type Action = { label: string; onPress: () => void; hint?: string };

type LookupStateNoticeProps =
  | {
      kind: 'failed';
      barcode: string;
      code: ProviderFailureCode;
      retryAfterSeconds: number | null;
      hasExpiredCache: boolean;
      actions: { retry: Action; useCached: Action; secondary: Action[] };
    }
  | { kind: 'not_found'; barcode: string; fromCache: boolean; actions: { retry: Action; secondary: Action[] } };

export function LookupStateNotice(props: LookupStateNoticeProps) {
  if (props.kind === 'not_found') {
    return (
      <NoticeCard
        tone='warning'
        title='Product not found'
        message={`Open Food Facts has no food product for ${props.barcode}${props.fromCache ? ' (checked recently)' : ''}. You can create the food yourself or log it manually.`}
      >
        <View style={styles.actions}>
          {props.fromCache ? <TextButton label={props.actions.retry.label} size='small' onPress={props.actions.retry.onPress} /> : null}
          {props.actions.secondary.map((action) => (
            <TextButton key={action.label} label={action.label} size='small' onPress={action.onPress} accessibilityHint={action.hint} />
          ))}
        </View>
      </NoticeCard>
    );
  }
  const presentation = describeLookupFailure(props.code, props.retryAfterSeconds, props.hasExpiredCache);
  return (
    <NoticeCard tone='danger' title={presentation.title} message={presentation.message}>
      <View style={styles.actions}>
        {presentation.canRetry ? <TextButton label={props.actions.retry.label} size='small' icon='refresh' onPress={props.actions.retry.onPress} /> : null}
        {props.hasExpiredCache ? (
          <TextButton label={props.actions.useCached.label} size='small' onPress={props.actions.useCached.onPress} accessibilityHint={props.actions.useCached.hint} />
        ) : null}
        {props.actions.secondary.map((action) => (
          <TextButton key={action.label} label={action.label} size='small' onPress={action.onPress} accessibilityHint={action.hint} />
        ))}
      </View>
    </NoticeCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.xs,
  },
});
