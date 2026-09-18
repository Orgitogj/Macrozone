import { MEAL_TYPE_LABELS } from '@/features/meals/constants';
import { decodeAggregate } from '@/features/sync/utils/aggregatePayload';
import type { SyncAggregate, SyncConflict, SyncConflictReason, SyncEntityType } from '@/features/sync/types';
import { SYNC_PAYLOAD_VERSION } from '@/storage/database/syncSchema';
import { formatLongDate } from '@/utils/date';
import { formatCalories, formatGrams } from '@/utils/format';
import { formatTimeLabel } from '@/utils/time';

export type ConflictFieldRow = { label: string; value: string };

export type ConflictVersionView =
  | { kind: 'deleted' }
  | { kind: 'unreadable' }
  | { kind: 'values'; name: string; rows: ConflictFieldRow[] };

export type ConflictActionView = {
  available: boolean;
  unavailableReason: string | null;
  effect: string;
};

export type ConflictView = {
  id: string;
  typeLabel: string;
  title: string;
  reasonTitle: string;
  reasonDetail: string;
  local: ConflictVersionView;
  cloud: ConflictVersionView;
  detectedLabel: string;
  keepMine: ConflictActionView;
  useCloud: ConflictActionView;
  duplicate: ConflictActionView;
};

export const ENTITY_TYPE_LABELS: Readonly<Record<SyncEntityType, string>> = {
  meal: 'Logged meal',
  food: 'Food',
  saved_meal: 'Saved meal',
  recipe: 'Recipe',
  nutrition_plan: 'Nutrition goals',
};

const REASON_TITLES: Readonly<Record<SyncConflictReason, string>> = {
  concurrent_edit: 'Changed in two places',
  delete_vs_edit: 'Deleted in one place, changed in another',
  duplicate_food: 'Two versions of the same food',
  invalid_payload: 'MacroZone could not read this change',
};

const REASON_DETAILS: Readonly<Record<SyncConflictReason, string>> = {
  concurrent_edit: 'This item was edited on this device and on another device before they could sync.',
  delete_vs_edit: 'One device deleted this item while another device kept or changed it.',
  duplicate_food: 'A food with the same details already exists in your account.',
  invalid_payload: 'A newer version of MacroZone may have created this change.',
};

function macroRows(nutrition: { calories: number; protein: number; carbs: number; fat: number }): ConflictFieldRow[] {
  return [
    { label: 'Calories', value: formatCalories(nutrition.calories) },
    { label: 'Protein', value: formatGrams(nutrition.protein) },
    { label: 'Carbs', value: formatGrams(nutrition.carbs) },
    { label: 'Fat', value: formatGrams(nutrition.fat) },
  ];
}

export function describeAggregate(aggregate: SyncAggregate): { name: string; rows: ConflictFieldRow[] } {
  switch (aggregate.type) {
    case 'meal':
      return {
        name: aggregate.meal.name,
        rows: [
          { label: 'Meal', value: MEAL_TYPE_LABELS[aggregate.meal.mealType] },
          { label: 'Date', value: formatLongDate(aggregate.meal.date) },
          { label: 'Time', value: aggregate.meal.time === null ? 'No time set' : formatTimeLabel(aggregate.meal.time) },
          ...macroRows(aggregate.meal),
        ],
      };
    case 'food':
      return {
        name: aggregate.food.name,
        rows: [
          { label: 'Serving', value: `${aggregate.food.serving.amount} ${aggregate.food.serving.unit}` },
          ...macroRows(aggregate.food.nutrition),
          { label: 'Barcodes', value: aggregate.barcodes.length === 0 ? 'None' : aggregate.barcodes.map((link) => link.barcode).join(', ') },
        ],
      };
    case 'saved_meal':
      return {
        name: aggregate.savedMeal.name,
        rows: [
          { label: 'Foods', value: `${aggregate.savedMeal.items.length}` },
          {
            label: 'Calories',
            value: formatCalories(aggregate.savedMeal.items.reduce((total, item) => total + item.nutrition.calories, 0)),
          },
        ],
      };
    case 'recipe':
      return {
        name: aggregate.recipe.name,
        rows: [
          { label: 'Servings', value: `${aggregate.recipe.servings}` },
          { label: 'Ingredients', value: `${aggregate.recipe.ingredients.length}` },
          {
            label: 'Calories',
            value: formatCalories(aggregate.recipe.ingredients.reduce((total, item) => total + item.nutrition.calories, 0)),
          },
        ],
      };
    case 'nutrition_plan':
      return {
        name: 'Nutrition goals',
        rows: [
          {
            label: 'Daily calories',
            value: aggregate.plan.goals === null ? 'Not set' : formatCalories(aggregate.plan.goals.calories),
          },
          {
            label: 'Protein',
            value: aggregate.plan.goals === null ? 'Not set' : formatGrams(aggregate.plan.goals.protein),
          },
          { label: 'Carbs', value: aggregate.plan.goals === null ? 'Not set' : formatGrams(aggregate.plan.goals.carbs) },
          { label: 'Fat', value: aggregate.plan.goals === null ? 'Not set' : formatGrams(aggregate.plan.goals.fat) },
          { label: 'Your details', value: aggregate.plan.profile === null ? 'Not saved' : 'Saved' },
        ],
      };
  }
}

function versionView(
  entityType: SyncEntityType,
  entityId: string,
  payload: Record<string, unknown> | null,
  deleted: boolean,
): ConflictVersionView {
  if (deleted || payload === null) {
    return { kind: 'deleted' };
  }
  const aggregate = decodeAggregate(entityType, entityId, SYNC_PAYLOAD_VERSION, payload);
  if (aggregate === null) {
    return { kind: 'unreadable' };
  }
  const described = describeAggregate(aggregate);
  return { kind: 'values', name: described.name, rows: described.rows };
}

function nameOf(view: ConflictVersionView): string | null {
  return view.kind === 'values' ? view.name : null;
}

export function formatDetectedAt(detectedAt: string, now: Date): string {
  const parsed = Date.parse(detectedAt);
  if (!Number.isFinite(parsed)) {
    return 'Noticed recently';
  }
  const minutes = Math.floor((now.getTime() - parsed) / 60_000);
  if (minutes < 1) {
    return 'Noticed just now';
  }
  if (minutes < 60) {
    return `Noticed ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Noticed ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  return `Noticed ${days} day${days === 1 ? '' : 's'} ago`;
}

export function describeConflict(conflict: SyncConflict, now: Date): ConflictView {
  const local = versionView(conflict.entityType, conflict.entityId, conflict.localPayload, conflict.localDeleted);
  const cloud = versionView(conflict.entityType, conflict.entityId, conflict.cloudPayload, conflict.cloudDeleted);
  const typeLabel = ENTITY_TYPE_LABELS[conflict.entityType];
  const cloudReadable = cloud.kind !== 'unreadable';
  const canDuplicate = conflict.entityType !== 'nutrition_plan' && local.kind === 'values';

  return {
    id: conflict.id,
    typeLabel,
    title: nameOf(local) ?? nameOf(cloud) ?? typeLabel,
    reasonTitle: REASON_TITLES[conflict.reason],
    reasonDetail: REASON_DETAILS[conflict.reason],
    local,
    cloud,
    detectedLabel: formatDetectedAt(conflict.detectedAt, now),
    keepMine: {
      available: true,
      unavailableReason: null,
      effect:
        local.kind === 'deleted'
          ? 'Deletes this item everywhere, including on your other devices.'
          : 'Keeps the version on this device and replaces the cloud version on your other devices.',
    },
    useCloud: {
      available: cloudReadable,
      unavailableReason: cloudReadable
        ? null
        : 'This cloud version needs a newer version of MacroZone. Update the app to use it.',
      effect:
        cloud.kind === 'deleted'
          ? 'Removes this item from this device to match the cloud.'
          : 'Replaces the version on this device with the cloud version.',
    },
    duplicate: {
      available: canDuplicate && cloudReadable,
      unavailableReason: canDuplicate
        ? cloudReadable
          ? null
          : 'This cloud version needs a newer version of MacroZone. Update the app to use it.'
        : conflict.entityType === 'nutrition_plan'
          ? 'Nutrition goals are a single item, so they cannot be kept twice.'
          : 'There is no version on this device to keep as a copy.',
      effect: 'Keeps the cloud version and saves your version as a new separate item.',
    },
  };
}
