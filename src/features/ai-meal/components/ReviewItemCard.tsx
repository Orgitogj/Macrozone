import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FormField } from '@/components/ui/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { AI_CONFIDENCE_LABELS, AI_UNCERTAINTY_LABELS } from '@/features/ai-meal/constants';
import {
  changeItemAmount,
  changeItemName,
  changeItemNutrition,
  changeItemUnit,
  linkItemToFood,
  unlinkItem,
  type AiReviewItem,
} from '@/features/ai-meal/utils/reviewDraft';
import { LIBRARY_LIMITS, SERVING_UNIT_LABELS, SERVING_UNITS } from '@/features/library/constants';
import { formatServing } from '@/features/library/utils/servingFormat';
import { componentSizes, spacing } from '@/theme';
import { MACRO_KEYS, type MacroKey } from '@/types/nutrition';

type ReviewItemCardProps = {
  item: AiReviewItem;
  index: number;
  error: string | null;
  disabled: boolean;
  onChange: (update: (item: AiReviewItem) => AiReviewItem) => void;
  onRemove: () => void;
  onChooseFood: () => void;
};

const UNIT_OPTIONS = SERVING_UNITS.map((value) => ({
  value,
  label: SERVING_UNIT_LABELS[value].short,
  accessibilityLabel: SERVING_UNIT_LABELS[value].plural,
}));

const NUTRITION_FIELDS: Readonly<Record<MacroKey, { label: string; suffix: string }>> = {
  calories: { label: 'Calories', suffix: 'kcal' },
  protein: { label: 'Protein', suffix: 'g' },
  carbs: { label: 'Carbs', suffix: 'g' },
  fat: { label: 'Fat', suffix: 'g' },
};

export function ReviewItemCard({ item, index, error, disabled, onChange, onRemove, onChooseFood }: ReviewItemCardProps) {
  const displayName = item.name.trim() || `Item ${index + 1}`;
  const scalesWithAmount = item.reference !== null && item.reference.unit === item.unit;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant='subheading' accessibilityRole='header' style={styles.headerTitle}>
          {displayName}
        </AppText>
        <IconButton
          icon='trash-outline'
          tone='danger'
          onPress={onRemove}
          disabled={disabled}
          accessibilityLabel={`Remove ${displayName}`}
          accessibilityHint='Removes this item from the estimate'
        />
      </View>

      {item.confidence !== null || item.note !== null || item.uncertainties.length > 0 ? (
        <View style={styles.meta}>
          {item.confidence !== null ? (
            <AppText variant='caption' tone='secondary'>
              {`AI confidence: ${AI_CONFIDENCE_LABELS[item.confidence]}`}
            </AppText>
          ) : null}
          {item.uncertainties.length > 0 ? (
            <AppText variant='caption' tone='secondary'>
              {`Less certain because of: ${item.uncertainties.map((kind) => AI_UNCERTAINTY_LABELS[kind]).join(', ')}`}
            </AppText>
          ) : null}
          {item.note !== null ? (
            <AppText variant='caption' tone='secondary'>
              {item.note}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <FormField label='Name'>
        <AppTextInput
          value={item.name}
          onChangeText={(name) => onChange((current) => changeItemName(current, name))}
          maxLength={LIBRARY_LIMITS.nameMaxLength}
          editable={!disabled}
          accessibilityLabel={`Name for item ${index + 1}`}
        />
      </FormField>

      <FormField
        label='Amount'
        hint={
          scalesWithAmount
            ? 'Nutrition updates when you change the amount.'
            : 'Units are not converted. Check the nutrition values below.'
        }
      >
        <AppTextInput
          value={item.amountText}
          onChangeText={(amountText) => onChange((current) => changeItemAmount(current, amountText))}
          keyboardType='decimal-pad'
          suffix={SERVING_UNIT_LABELS[item.unit].short}
          editable={!disabled}
          accessibilityLabel={`Amount of ${displayName} in ${SERVING_UNIT_LABELS[item.unit].plural}`}
          returnKeyType='done'
        />
        <ChipGroup
          options={UNIT_OPTIONS}
          value={item.unit}
          onChange={(unit) => onChange((current) => changeItemUnit(current, unit))}
          disabled={disabled}
          accessibilityLabel={`Unit for ${displayName}`}
        />
      </FormField>

      <View style={styles.nutrition}>
        {MACRO_KEYS.map((key) => (
          <FormField key={key} label={NUTRITION_FIELDS[key].label} style={styles.nutritionField}>
            <AppTextInput
              value={item.nutritionText[key]}
              onChangeText={(text) => onChange((current) => changeItemNutrition(current, key, text))}
              keyboardType='decimal-pad'
              suffix={NUTRITION_FIELDS[key].suffix}
              editable={!disabled}
              accessibilityLabel={`${NUTRITION_FIELDS[key].label} for ${displayName}`}
              returnKeyType='done'
            />
          </FormField>
        ))}
      </View>

      <View style={styles.match}>
        {item.matchedFood ? (
          <>
            <AppText variant='caption' tone='secondary'>
              {`Using your food “${item.matchedFood.name}” (${formatServing(item.matchedFood.serving)}). Later changes to that food do not change this entry.`}
            </AppText>
            <View style={styles.matchActions}>
              <TextButton
                label='Unlink'
                size='small'
                tone='secondary'
                disabled={disabled}
                onPress={() => onChange(unlinkItem)}
                accessibilityHint='Stops using your food and restores the AI estimate'
              />
              <TextButton label='Choose Another Food' size='small' disabled={disabled} onPress={onChooseFood} />
            </View>
          </>
        ) : (
          <>
            {item.suggestions.length > 0 ? (
              <AppText variant='caption' tone='secondary'>
                Similar foods in your library:
              </AppText>
            ) : null}
            <View style={styles.matchActions}>
              {item.suggestions.map((food) => (
                <TextButton
                  key={food.id}
                  label={`Use ${food.name}`}
                  size='small'
                  disabled={disabled}
                  onPress={() => onChange((current) => linkItemToFood(current, food))}
                  accessibilityHint={`Uses the nutrition of your food, per ${formatServing(food.serving)}`}
                />
              ))}
              <TextButton
                label='Choose from Your Foods'
                size='small'
                tone={item.suggestions.length > 0 ? 'secondary' : 'primary'}
                disabled={disabled}
                onPress={onChooseFood}
              />
            </View>
          </>
        )}
      </View>

      {error ? (
        <AppText variant='caption' tone='danger' accessibilityRole='alert' accessibilityLiveRegion='polite'>
          {error}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  meta: {
    gap: spacing.xxs,
  },
  nutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  nutritionField: {
    flexGrow: 1,
    flexBasis: componentSizes.control * 2.5,
  },
  match: {
    gap: spacing.xs,
  },
  matchActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.xs,
  },
});
