import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppSwitch } from '@/components/ui/AppSwitch';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FormField } from '@/components/ui/FormField';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextButton } from '@/components/ui/TextButton';
import { OpenFoodFactsAttribution } from '@/features/barcode/components/OpenFoodFactsAttribution';
import { ProductImage } from '@/features/barcode/components/ProductImage';
import { BARCODE_COPY } from '@/features/barcode/constants';
import type { FoodDecision, LinkedFoodState } from '@/features/barcode/hooks/useBarcodeFlow';
import type { BasisId, ManualBasisUnit } from '@/features/barcode/types';
import { describeBarcodeForAccessibility, describeCacheAge, describeConsumedForAccessibility } from '@/features/barcode/utils/barcodeLabels';
import { describeBasis, describeProductWarning } from '@/features/barcode/utils/nutritionBasis';
import {
  applyFoodValues,
  canUseFoodValues,
  changeProductAmount,
  changeProductName,
  changeProductNutrient,
  currentServing,
  describeCurrentBasis,
  findBasis,
  MISSING_VALUE_MESSAGE,
  previewConsumed,
  selectBasis,
  selectManualUnit,
  type ProductReviewDraft,
  type ProductReviewErrors,
} from '@/features/barcode/utils/productReviewDraft';
import { NutritionPreview } from '@/features/library/components/NutritionPreview';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { formatServing } from '@/features/library/utils/servingFormat';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { componentSizes, spacing } from '@/theme';
import type { LocalDateKey } from '@/utils/date';
import { MACRO_KEYS, type MacroKey } from '@/types/nutrition';

type ProductReviewFormProps = {
  draft: ProductReviewDraft;
  destination: LogDestination;
  todayKey: LocalDateKey;
  nowMs: number;
  errors: ProductReviewErrors | null;
  saveMessage: string | null;
  isSaving: boolean;
  linkedFood: LinkedFoodState;
  foodDecision: FoodDecision;
  onChangeDestination: (destination: LogDestination) => void;
  onEdit: (update: (draft: ProductReviewDraft) => ProductReviewDraft) => void;
  onFoodDecision: (decision: FoodDecision) => void;
  onSave: () => void;
  onRetry: () => void;
  onScanAnother: () => void;
  onLogManually: () => void;
};

const NUTRIENT_FIELDS: Readonly<Record<MacroKey, { label: string; suffix: string }>> = {
  calories: { label: 'Calories', suffix: 'kcal' },
  protein: { label: 'Protein', suffix: 'g' },
  carbs: { label: 'Carbs', suffix: 'g' },
  fat: { label: 'Fat', suffix: 'g' },
};

const MANUAL_UNIT_OPTIONS: readonly { value: ManualBasisUnit; label: string }[] = [
  { value: 'g', label: 'Per 100 g' },
  { value: 'ml', label: 'Per 100 ml' },
  { value: 'serving', label: 'Per serving' },
];

export function ProductReviewForm({
  draft,
  destination,
  todayKey,
  nowMs,
  errors,
  saveMessage,
  isSaving,
  linkedFood,
  foodDecision,
  onChangeDestination,
  onEdit,
  onFoodDecision,
  onSave,
  onRetry,
  onScanAnother,
  onLogManually,
}: ProductReviewFormProps) {
  const basis = findBasis(draft);
  const serving = currentServing(draft);
  const consumed = previewConsumed(draft);
  const basisOptions: { value: BasisId; label: string }[] = [
    ...draft.bases.map((option) => ({ value: option.id, label: describeBasis(option) })),
    { value: 'manual', label: 'Enter my own' },
  ];
  const linked = linkedFood.status === 'ready' ? linkedFood.food : null;
  const amountSuffix = serving.unit === 'serving' ? 'servings' : serving.unit;
  const title = draft.name.trim() || 'Unnamed product';

  return (
    <View style={styles.content}>
      <AppCard style={styles.section}>
        <ProductImage url={draft.product.imageUrl} productName={title} />
        <AppText variant='title' accessibilityRole='header'>
          {title}
        </AppText>
        {draft.product.brand ? (
          <AppText variant='body' tone='secondary'>
            {draft.product.brand}
          </AppText>
        ) : null}
        <AppText variant='caption' tone='secondary' accessibilityLabel={describeBarcodeForAccessibility(draft.product.barcode)}>
          {`Barcode ${draft.product.barcode}`}
        </AppText>
        {draft.product.quantityText ? (
          <AppText variant='caption' tone='secondary'>
            {`Package: ${draft.product.quantityText}`}
          </AppText>
        ) : null}
        {draft.product.servingText ? (
          <AppText variant='caption' tone='secondary'>
            {`Serving on package: ${draft.product.servingText}`}
          </AppText>
        ) : null}
        <OpenFoodFactsAttribution productUrl={draft.product.sourceUrl} compact />
      </AppCard>

      <NoticeCard tone='warning' title='Check before saving' message={BARCODE_COPY.dataNotice}>
        {draft.warnings.map((warning) => (
          <AppText key={warning} variant='caption' tone='secondary'>
            {`• ${describeProductWarning(warning)}`}
          </AppText>
        ))}
        <AppText variant='caption' tone='muted'>
          {BARCODE_COPY.notMedicalAdvice}
        </AppText>
      </NoticeCard>

      {draft.stale ? (
        <NoticeCard
          tone='info'
          title='Showing saved product data'
          message={`This product was ${describeCacheAge(draft.fetchedAt, nowMs)} and could not be refreshed. It may be out of date.`}
        >
          <TextButton label='Try Again' size='small' icon='refresh' onPress={onRetry} disabled={isSaving} />
        </NoticeCard>
      ) : null}

      <FormField label='Name' error={errors?.name}>
        <AppTextInput
          value={draft.name}
          onChangeText={(name) => onEdit((current) => changeProductName(current, name))}
          maxLength={LIBRARY_LIMITS.nameMaxLength}
          editable={!isSaving}
          hasError={Boolean(errors?.name)}
          accessibilityLabel='Product name'
        />
      </FormField>

      <View style={styles.section}>
        <AppText variant='subheading' accessibilityRole='header'>
          Nutrition basis
        </AppText>
        <ChipGroup
          options={basisOptions}
          value={draft.basisId}
          onChange={(basisId) => onEdit((current) => selectBasis(current, basisId))}
          disabled={isSaving}
          accessibilityLabel='Nutrition basis'
        />
        {draft.basisId === 'manual' ? (
          <SegmentedControl
            options={MANUAL_UNIT_OPTIONS}
            value={draft.manualUnit}
            onChange={(unit) => onEdit((current) => selectManualUnit(current, unit))}
            disabled={isSaving}
            accessibilityLabel='Values entered per'
          />
        ) : null}
        <AppText variant='caption' tone='secondary'>
          {`${describeCurrentBasis(draft)}. Values are not converted between grams, milliliters, and servings.`}
        </AppText>
      </View>

      <View style={styles.nutrition}>
        {MACRO_KEYS.map((key) => {
          const error = errors?.nutrition[key];
          const missing = basis !== null && basis.missing.includes(key) && draft.nutritionText[key].trim() === '';
          const approximate = basis !== null && basis.approximate.includes(key);
          return (
            <FormField
              key={key}
              label={NUTRIENT_FIELDS[key].label}
              error={error}
              hint={missing ? MISSING_VALUE_MESSAGE : approximate ? 'Approximate value' : undefined}
              style={styles.nutritionField}
            >
              <AppTextInput
                value={draft.nutritionText[key]}
                onChangeText={(text) => onEdit((current) => changeProductNutrient(current, key, text))}
                keyboardType='decimal-pad'
                suffix={NUTRIENT_FIELDS[key].suffix}
                editable={!isSaving}
                hasError={Boolean(error)}
                placeholder={missing ? 'Missing' : undefined}
                accessibilityLabel={`${NUTRIENT_FIELDS[key].label}, ${describeCurrentBasis(draft)}`}
                accessibilityHint={missing ? MISSING_VALUE_MESSAGE : undefined}
                returnKeyType='done'
              />
            </FormField>
          );
        })}
      </View>

      <FormField label='Amount eaten' error={errors?.amount} hint={serving.unit === 'serving' ? 'Number of servings.' : `In ${serving.unit}.`}>
        <AppTextInput
          value={draft.amountText}
          onChangeText={(amountText) => onEdit((current) => changeProductAmount(current, amountText))}
          keyboardType='decimal-pad'
          suffix={amountSuffix}
          editable={!isSaving}
          hasError={Boolean(errors?.amount)}
          accessibilityLabel={serving.unit === 'serving' ? 'Servings eaten' : `Amount eaten in ${serving.unit === 'g' ? 'grams' : 'milliliters'}`}
          returnKeyType='done'
        />
      </FormField>

      <View accessible accessibilityLabel={describeConsumedForAccessibility(title, consumed)}>
        <NutritionPreview
          title="You'll add"
          nutrition={consumed}
          caption='Calculated by MacroZone from the values above.'
          unavailableMessage='Complete the amount and every nutrition value to see what will be added.'
        />
      </View>

      <LogDestinationFields destination={destination} todayKey={todayKey} onChange={onChangeDestination} disabled={isSaving} />

      <AppCard style={styles.section}>
        <AppText variant='subheading' accessibilityRole='header'>
          My Foods
        </AppText>
        {linkedFood.status === 'loading' ? (
          <AppText variant='caption' tone='secondary'>
            Checking My Foods…
          </AppText>
        ) : linked !== null ? (
          <>
            <AppText variant='body' tone='secondary'>
              {`This barcode is linked to your food “${linked.name}” (${formatServing(linked.serving)}).`}
            </AppText>
            <SegmentedControl
              options={[
                { value: 'keep', label: 'Keep My Food' },
                { value: 'update', label: 'Update My Food' },
              ]}
              value={foodDecision === 'update' ? 'update' : 'keep'}
              onChange={onFoodDecision}
              disabled={isSaving}
              accessibilityLabel='What to do with your linked food'
            />
            <AppText variant='caption' tone='secondary'>
              {foodDecision === 'update'
                ? 'Your food will be updated with the name, basis, and nutrition shown above after you confirm. Logged meals do not change.'
                : 'Your food stays as it is.'}
            </AppText>
            {canUseFoodValues(linked) ? (
              <TextButton
                label="Use My Food's Values"
                size='small'
                disabled={isSaving}
                onPress={() => onEdit((current) => applyFoodValues(current, linked))}
                accessibilityHint='Replaces the values above with the values saved in your food'
              />
            ) : null}
          </>
        ) : (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant='bodyStrong'>Also save to My Foods</AppText>
              <AppText variant='caption' tone='secondary'>
                {draft.basisId === 'manual' || basis === null
                  ? 'Saves the name and the values you entered so you can log it offline later.'
                  : `Saves “${title}” with ${describeCurrentBasis(draft).toLowerCase()} values so you can log it offline later.`}
              </AppText>
            </View>
            <AppSwitch
              value={foodDecision === 'create'}
              onValueChange={(value) => onFoodDecision(value ? 'create' : 'none')}
              disabled={isSaving}
              accessibilityLabel='Also save to My Foods'
            />
          </View>
        )}
      </AppCard>

      {saveMessage ? <NoticeCard tone='danger' message={saveMessage} /> : null}

      <AppButton label='Add to Diary' onPress={onSave} loading={isSaving} accessibilityHint='Adds the reviewed values to your diary' />

      <View style={styles.secondary}>
        <AppButton label='Scan Another Product' variant='secondary' onPress={onScanAnother} disabled={isSaving} />
        <AppButton label='Log Manually' variant='secondary' onPress={onLogManually} disabled={isSaving} />
        <TextButton label='Look Up Again' size='small' icon='refresh' onPress={onRetry} disabled={isSaving} style={styles.center} accessibilityHint='Refreshes the product from Open Food Facts. Your changes are replaced.' />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: spacing.xxs,
  },
  secondary: {
    gap: spacing.md,
  },
  center: {
    alignSelf: 'center',
  },
});
