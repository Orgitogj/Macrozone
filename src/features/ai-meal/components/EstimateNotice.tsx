import { AppText } from '@/components/ui/AppText';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { AI_CONFIDENCE_LABELS, AI_ESTIMATE_NOTICE, AI_PHOTO_CAVEAT } from '@/features/ai-meal/constants';
import type { AiConfidence, AiInputKind } from '@/features/ai-meal/types';

type EstimateNoticeProps = {
  inputKind: AiInputKind;
  quality: AiConfidence;
  warnings: readonly string[];
};

export function EstimateNotice({ inputKind, quality, warnings }: EstimateNoticeProps) {
  return (
    <NoticeCard tone='warning' title='Review this estimate' message={AI_ESTIMATE_NOTICE}>
      <AppText variant='caption' tone='secondary'>
        {`Overall confidence: ${AI_CONFIDENCE_LABELS[quality]}`}
      </AppText>
      {inputKind === 'photo' ? (
        <AppText variant='caption' tone='secondary'>
          {AI_PHOTO_CAVEAT}
        </AppText>
      ) : null}
      {warnings.map((warning, index) => (
        <AppText key={`${index}-${warning}`} variant='caption' tone='secondary'>
          {`• ${warning}`}
        </AppText>
      ))}
      <AppText variant='caption' tone='muted'>
        Nutrition values are estimates, not medical advice.
      </AppText>
    </NoticeCard>
  );
}
