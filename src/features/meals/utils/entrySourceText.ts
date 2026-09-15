import { formatAmount, formatServingAmount } from '@/features/library/utils/servingFormat';
import type { MealEntrySource } from '@/features/meals/types';

export function describeEntrySource(source: MealEntrySource): string {
  const origin =
    source.sourceType === 'recipe'
      ? `Added from the recipe "${source.sourceName}", ${formatAmount(source.amount)} ${source.amount === 1 ? 'serving' : 'servings'}.`
      : `Added from your food library: ${source.sourceName}, ${formatServingAmount(source.amount, source.serving.unit)}${source.savedMealId || source.logGroupId ? ', as part of a saved meal' : ''}.`;
  return `${origin} Its nutrition was saved when it was added. Changing the name or nutrition here turns it into a manual entry.`;
}
