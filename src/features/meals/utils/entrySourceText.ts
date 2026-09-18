import { formatAmount, formatServingAmount } from '@/features/library/utils/servingFormat';
import type { MealEntrySource } from '@/features/meals/types';

export function describeEntrySource(source: MealEntrySource): string {
  if (source.sourceType === 'product') {
    return `Added from a barcode scan (${source.barcode}) using data from Open Food Facts: ${source.itemName}, ${formatServingAmount(source.amount, source.serving.unit)}. ${source.userReviewed ? 'You changed the product details before saving.' : 'You reviewed the product details before saving.'} Its nutrition was saved when it was added and does not change if the online product changes. Changing the name or nutrition here turns it into a manual entry.`;
  }
  if (source.sourceType === 'ai') {
    const input = source.inputKind === 'photo' ? 'a photo' : 'a description';
    return `Added from an AI estimate of ${input}, as part of "${source.mealTitle}": ${source.itemName}, ${formatServingAmount(source.amount, source.unit)}. You reviewed these values before saving. AI estimates can be inaccurate. Changing the name or nutrition here turns it into a manual entry.`;
  }
  const origin =
    source.sourceType === 'recipe'
      ? `Added from the recipe "${source.sourceName}", ${formatAmount(source.amount)} ${source.amount === 1 ? 'serving' : 'servings'}.`
      : `Added from your food library: ${source.sourceName}, ${formatServingAmount(source.amount, source.serving.unit)}${source.savedMealId || source.logGroupId ? ', as part of a saved meal' : ''}.`;
  return `${origin} Its nutrition was saved when it was added. Changing the name or nutrition here turns it into a manual entry.`;
}
