import type { FoodSaveChoice } from '@/features/barcode/services/barcodeLogService';
import type { Food } from '@/features/library/types';

export type FoodDecision = 'none' | 'create' | 'keep' | 'update';

export type SaveOperationTracker = {
  idFor(fingerprint: unknown): string;
  reset(): void;
};

export function createSaveOperationTracker(generateId: () => string): SaveOperationTracker {
  let current: { fingerprint: string; id: string } | null = null;
  return {
    idFor: (input) => {
      const fingerprint = JSON.stringify(input);
      if (current === null || current.fingerprint !== fingerprint) {
        current = { fingerprint, id: generateId() };
      }
      return current.id;
    },
    reset: () => {
      current = null;
    },
  };
}

export async function resolveFoodSaveChoice({
  linkedFood,
  decision,
  confirmUpdate,
}: {
  linkedFood: Food | null;
  decision: FoodDecision;
  confirmUpdate: (food: Food) => Promise<boolean>;
}): Promise<FoodSaveChoice | null> {
  if (linkedFood === null) {
    return decision === 'create' ? { kind: 'create' } : { kind: 'none' };
  }
  if (decision !== 'update') {
    return { kind: 'keep_linked', foodId: linkedFood.id };
  }
  return (await confirmUpdate(linkedFood)) ? { kind: 'update_linked', foodId: linkedFood.id } : null;
}
