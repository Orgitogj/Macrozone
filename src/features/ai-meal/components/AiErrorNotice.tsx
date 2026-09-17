import { StyleSheet, View } from 'react-native';

import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import type { AiErrorCode } from '@/features/ai-meal/types';
import { describeAiError } from '@/features/ai-meal/utils/aiErrorMessages';
import { spacing } from '@/theme';

type AiErrorNoticeProps = {
  code: AiErrorCode;
  serverMessage: string | null;
  retryAfterSeconds: number | null;
  onRetry: () => void;
  onLogManually: () => void;
};

export function AiErrorNotice({ code, serverMessage, retryAfterSeconds, onRetry, onLogManually }: AiErrorNoticeProps) {
  const error = describeAiError(code, serverMessage, retryAfterSeconds);

  return (
    <NoticeCard tone='danger' title={error.title} message={error.message}>
      <View style={styles.actions}>
        {error.canRetry ? <TextButton label='Try Again' size='small' icon='refresh' onPress={onRetry} /> : null}
        <TextButton label='Log Manually' size='small' onPress={onLogManually} accessibilityHint='Opens the manual meal form' />
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
