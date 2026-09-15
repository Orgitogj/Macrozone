import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { SERVING_UNIT_LABELS } from '@/features/library/constants';
import { calculateLoggedPortionNutrition, NutritionCalculationError } from '@/features/library/utils/nutritionMath';
import { formatServing } from '@/features/library/utils/servingFormat';
import { parsePortionAmount, type PortionDraft } from '@/features/library/validation/portions';
import { iconSizes, spacing } from '@/theme';
import { formatCalories } from '@/utils/format';

type PortionListEditorProps = {
  title: string;
  items: readonly PortionDraft[];
  itemErrors: Record<string, string>;
  listError?: string;
  addLabel: string;
  disabled: boolean;
  onChangeAmount: (key: string, amountText: string) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
};

function previewCalories(item: PortionDraft): string | null {
  const amount = parsePortionAmount(item.amountText, item.serving);
  if (!amount.ok) {
    return null;
  }
  try {
    return `${formatCalories(calculateLoggedPortionNutrition({ ...item, amount: amount.value }).calories)} kcal`;
  } catch (error) {
    if (error instanceof NutritionCalculationError) {
      return null;
    }
    throw error;
  }
}

export function PortionListEditor({
  title,
  items,
  itemErrors,
  listError,
  addLabel,
  disabled,
  onChangeAmount,
  onRemove,
  onAdd,
}: PortionListEditorProps) {
  return (
    <View style={styles.container}>
      <AppText variant='subheading' accessibilityRole='header'>
        {title}
      </AppText>
      {items.map((item) => {
        const calories = previewCalories(item);
        const error = itemErrors[item.key];
        return (
          <AppCard key={item.key} padding='md' style={styles.item}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTitle}>
                <AppText variant='bodyStrong'>{item.foodName}</AppText>
                <AppText variant='caption' tone='secondary'>
                  {`${formatCalories(item.nutrition.calories)} kcal per ${formatServing(item.serving)}${item.foodId === null ? ' · not in food library' : ''}`}
                </AppText>
              </View>
              <IconButton
                icon='close'
                size={iconSizes.md}
                tone='secondary'
                onPress={() => onRemove(item.key)}
                disabled={disabled}
                accessibilityLabel={`Remove ${item.foodName}`}
              />
            </View>
            <View style={styles.amountRow}>
              <AppTextInput
                value={item.amountText}
                onChangeText={(text) => onChangeAmount(item.key, text)}
                keyboardType='decimal-pad'
                suffix={SERVING_UNIT_LABELS[item.serving.unit].short}
                hasError={Boolean(error)}
                editable={!disabled}
                accessibilityLabel={`Amount of ${item.foodName} in ${SERVING_UNIT_LABELS[item.serving.unit].plural}`}
                accessibilityHint={error}
              />
              <AppText variant='label' tone='secondary'>
                {calories ?? '—'}
              </AppText>
            </View>
            {error ? (
              <AppText variant='caption' tone='danger' accessibilityRole='alert'>
                {error}
              </AppText>
            ) : null}
          </AppCard>
        );
      })}
      {listError ? (
        <AppText variant='caption' tone='danger' accessibilityRole='alert'>
          {listError}
        </AppText>
      ) : null}
      <TextButton label={addLabel} icon='add' onPress={onAdd} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  item: {
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  amountRow: {
    gap: spacing.xs,
  },
});
