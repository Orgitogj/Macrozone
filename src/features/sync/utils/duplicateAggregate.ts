import type { SyncAggregate } from '@/features/sync/types';
import { LIBRARY_LIMITS } from '@/features/library/constants';

function copyName(name: string): string {
  const suffix = ' (copy)';
  return `${name.slice(0, LIBRARY_LIMITS.nameMaxLength - suffix.length).trimEnd()}${suffix}`;
}

export function copyAggregateAsNewEntity(
  aggregate: SyncAggregate,
  generateId: () => string,
  timestamp: string,
): SyncAggregate | null {
  switch (aggregate.type) {
    case 'meal': {
      const id = generateId();
      return {
        type: 'meal',
        id,
        meal: { ...aggregate.meal, id, createdAt: timestamp, updatedAt: timestamp },
        source: aggregate.source === null ? null : { ...aggregate.source },
      };
    }
    case 'food': {
      const id = generateId();
      return {
        type: 'food',
        id,
        food: { ...aggregate.food, id, name: copyName(aggregate.food.name), createdAt: timestamp, updatedAt: timestamp },
        barcodes: [],
      };
    }
    case 'saved_meal': {
      const id = generateId();
      return {
        type: 'saved_meal',
        id,
        savedMeal: {
          ...aggregate.savedMeal,
          id,
          name: copyName(aggregate.savedMeal.name),
          items: aggregate.savedMeal.items.map((item) => ({ ...item, id: generateId() })),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      };
    }
    case 'recipe': {
      const id = generateId();
      return {
        type: 'recipe',
        id,
        recipe: {
          ...aggregate.recipe,
          id,
          name: copyName(aggregate.recipe.name),
          ingredients: aggregate.recipe.ingredients.map((item) => ({ ...item, id: generateId() })),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      };
    }
    case 'nutrition_plan':
      return null;
  }
}
