import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { ScrollScreen } from '@/components/layout/ScrollScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextButton } from '@/components/ui/TextButton';
import { AiErrorNotice } from '@/features/ai-meal/components/AiErrorNotice';
import { AnalysisProgress } from '@/features/ai-meal/components/AnalysisProgress';
import { EstimateNotice } from '@/features/ai-meal/components/EstimateNotice';
import { MealPhotoPicker } from '@/features/ai-meal/components/MealPhotoPicker';
import { MealTextComposer } from '@/features/ai-meal/components/MealTextComposer';
import { ReviewItemCard } from '@/features/ai-meal/components/ReviewItemCard';
import { AI_INPUT_KIND_LABELS, AI_LIMITS, AI_PHOTO_NOTE_EXAMPLE } from '@/features/ai-meal/constants';
import { useAiMealFlow } from '@/features/ai-meal/hooks/useAiMealFlow';
import { useAiMealNavigation } from '@/features/ai-meal/hooks/useAiMealNavigation';
import type { AiInputKind } from '@/features/ai-meal/types';
import { linkItemToFood, summarizeValidReviewItems } from '@/features/ai-meal/utils/reviewDraft';
import { FoodPickerModal } from '@/features/library/components/FoodPickerModal';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import { useMealNavigation } from '@/features/meals/hooks/useMealNavigation';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { spacing } from '@/theme';

type AiMealScreenProps = {
  initialDestination: LogDestination;
  initialInput: AiInputKind;
};

const INPUT_OPTIONS = (['text', 'photo'] as const).map((value) => ({ value, label: AI_INPUT_KIND_LABELS[value] }));

function pluralizeItems(count: number): string {
  return count === 1 ? '1 item' : `${count} items`;
}

export function AiMealScreen({ initialDestination, initialInput }: AiMealScreenProps) {
  const todayKey = useTodayDateKey();
  const flow = useAiMealFlow(initialInput);
  const mealNavigation = useMealNavigation();
  const aiNavigation = useAiMealNavigation();
  const [destination, setDestination] = useState(initialDestination);
  const [pickerItemKey, setPickerItemKey] = useState<string | null>(null);
  const { state } = flow;

  const clarificationQuestion = state.phase === 'clarify' ? state.question : null;

  useEffect(() => {
    if (state.phase === 'analyzing') {
      AccessibilityInfo.announceForAccessibility('Estimating nutrition. This can take up to a minute.');
    } else if (state.phase === 'review') {
      AccessibilityInfo.announceForAccessibility('Estimate ready. Review each item before adding it to your diary.');
    } else if (clarificationQuestion !== null) {
      AccessibilityInfo.announceForAccessibility(`More detail needed. ${clarificationQuestion}`);
    }
  }, [state.phase, clarificationQuestion]);

  const logManually = () => aiNavigation.replaceWithManual(destination);

  if (!flow.isConfigured) {
    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <NoticeCard
            tone='info'
            title='AI estimates are not set up'
            message='This version of MacroZone is not connected to an AI service. You can still log this meal manually.'
          />
          <AppButton label='Log Manually' onPress={logManually} />
        </View>
      </ScrollScreen>
    );
  }

  if (state.phase === 'review') {
    const { draft } = state;
    const feedback = flow.saveFeedback;
    const summary = summarizeValidReviewItems(draft);
    const itemCount = draft.items.length;
    const disabled = flow.isSaving;

    return (
      <ScrollScreen edges={['bottom']}>
        <View style={styles.content}>
          <EstimateNotice inputKind={draft.inputKind} quality={draft.quality} warnings={draft.warnings} />

          <FormField label='Meal title' error={feedback.titleError ?? undefined} hint='Shown with each entry this estimate adds.'>
            <AppTextInput
              value={draft.title}
              onChangeText={(title) => flow.editDraft((current) => ({ ...current, title }))}
              maxLength={LIBRARY_LIMITS.nameMaxLength}
              editable={!disabled}
              hasError={Boolean(feedback.titleError)}
              accessibilityLabel='Meal title'
            />
          </FormField>

          <View style={styles.section}>
            <AppText variant='heading' accessibilityRole='header'>
              {pluralizeItems(itemCount)}
            </AppText>
            <AppText variant='caption' tone='secondary'>
              Each item is added to your diary as its own entry.
            </AppText>
          </View>

          {draft.items.map((item, index) => (
            <ReviewItemCard
              key={item.key}
              item={item}
              index={index}
              error={feedback.itemErrors[item.key] ?? null}
              disabled={disabled}
              onChange={(update) => flow.editItem(item.key, update)}
              onRemove={() => flow.removeItem(item.key)}
              onChooseFood={() => setPickerItemKey(item.key)}
            />
          ))}

          {feedback.listError ? (
            <AppText variant='body' tone='danger' accessibilityRole='alert' accessibilityLiveRegion='polite'>
              {feedback.listError}
            </AppText>
          ) : null}

          <TextButton
            label='Add Item'
            icon='add'
            onPress={flow.addItem}
            disabled={disabled || itemCount >= AI_LIMITS.maxItems}
            accessibilityHint={
              itemCount >= AI_LIMITS.maxItems ? `You can add up to ${AI_LIMITS.maxItems} items.` : 'Adds an empty item to fill in yourself'
            }
          />

          <NutritionPreview
            title="You'll add"
            nutrition={summary.validCount > 0 ? summary.totals : null}
            caption={
              summary.validCount > 0 && summary.validCount < itemCount
                ? `Totals include ${summary.validCount} of ${itemCount} items. Fix the others to include them.`
                : 'Totals are calculated by MacroZone from the values above.'
            }
            unavailableMessage='Complete at least one item to see totals.'
          />

          <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} disabled={disabled} />

          {feedback.message ? <NoticeCard tone='danger' message={feedback.message} /> : null}

          <AppButton
            label={`Add ${pluralizeItems(itemCount)} to Diary`}
            onPress={() => void flow.save(destination, todayKey, () => mealNavigation.showDay(destination.date))}
            loading={flow.isSaving}
            disabled={itemCount === 0}
            accessibilityHint='Adds the reviewed values to your diary'
          />

          <View style={styles.secondary}>
            <AppButton
              label='Analyze Again'
              variant='secondary'
              onPress={flow.retryAnalysis}
              disabled={disabled}
              accessibilityHint='Requests a new estimate. Your changes are replaced.'
            />
            <AppButton
              label={draft.inputKind === 'photo' ? 'Change Photo' : 'Edit Description'}
              variant='secondary'
              onPress={flow.editInput}
              disabled={disabled}
              accessibilityHint='Returns to your input. This estimate is discarded.'
            />
            <TextButton label='Cancel' tone='secondary' onPress={mealNavigation.goBack} disabled={disabled} style={styles.cancel} />
          </View>
        </View>

        <FoodPickerModal
          visible={pickerItemKey !== null}
          title='Choose a Food'
          onClose={() => setPickerItemKey(null)}
          onSelect={(food) => {
            if (pickerItemKey !== null) {
              flow.editItem(pickerItemKey, (item) => linkItemToFood(item, food));
            }
            setPickerItemKey(null);
          }}
        />
      </ScrollScreen>
    );
  }

  const isAnalyzing = state.phase === 'analyzing';
  const isPhoto = flow.inputKind === 'photo';

  return (
    <ScrollScreen edges={['bottom']}>
      <View style={styles.content}>
        <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} disabled={isAnalyzing} />

        <SegmentedControl
          options={INPUT_OPTIONS}
          value={flow.inputKind}
          onChange={flow.setInputKind}
          accessibilityLabel='Estimate from'
          disabled={isAnalyzing}
        />

        {isPhoto ? (
          <MealPhotoPicker
            photo={flow.photo}
            notice={flow.photoNotice}
            isPicking={flow.isPickingPhoto}
            isCameraAvailable={flow.isCameraAvailable}
            disabled={isAnalyzing}
            onPick={flow.choosePhoto}
            onRemove={flow.removePhoto}
            onOpenSettings={flow.openSettings}
          />
        ) : (
          <MealTextComposer value={flow.text} onChange={flow.setText} error={flow.textError} disabled={isAnalyzing} />
        )}

        {isPhoto ? (
          <FormField label='Details' optional hint={AI_PHOTO_NOTE_EXAMPLE}>
            <AppTextInput
              value={flow.photoNote}
              onChangeText={flow.setPhotoNote}
              maxLength={AI_LIMITS.maxPhotoNoteLength}
              editable={!isAnalyzing}
              multiline
              accessibilityLabel='Details about the meal in the photo'
              accessibilityHint='Optional. Sent with the photo when you tap Analyze.'
            />
          </FormField>
        ) : null}

        {state.phase === 'clarify' ? (
          <NoticeCard tone='warning' title='More detail needed' message={state.question}>
            <AppText variant='caption' tone='secondary'>
              {state.inputKind === 'photo'
                ? 'Answer in Details above, then tap Analyze again. Nothing was estimated yet.'
                : 'Add the answer to your description, then tap Analyze again. Nothing was estimated yet.'}
            </AppText>
          </NoticeCard>
        ) : null}

        {state.phase === 'error' ? (
          <AiErrorNotice
            code={state.code}
            serverMessage={state.serverMessage}
            retryAfterSeconds={state.retryAfterSeconds}
            onRetry={flow.retryAnalysis}
            onLogManually={logManually}
          />
        ) : null}

        {isAnalyzing ? (
          <AnalysisProgress inputKind={state.inputKind} onCancel={flow.cancel} />
        ) : (
          <AppButton
            label={state.phase === 'clarify' ? 'Analyze Again' : 'Analyze'}
            onPress={flow.analyze}
            disabled={flow.isPickingPhoto || (isPhoto && flow.photo === null)}
            accessibilityHint={
              isPhoto
                ? 'Sends this photo to the AI service for an estimate you can review'
                : 'Sends this description to the AI service for an estimate you can review'
            }
          />
        )}

        <AppText variant='caption' tone='muted'>
          {isPhoto
            ? 'Nothing is sent until you tap Analyze. The photo is not saved by MacroZone.'
            : 'Nothing is sent until you tap Analyze. MacroZone does not save your description.'}
        </AppText>

        <TextButton label='Log Manually Instead' onPress={logManually} disabled={isAnalyzing} accessibilityHint='Opens the manual meal form' />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.xs,
  },
  secondary: {
    gap: spacing.md,
  },
  cancel: {
    alignSelf: 'center',
  },
});
