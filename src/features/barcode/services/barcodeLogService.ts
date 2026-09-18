import {
  BARCODE_LOG_MESSAGES,
  BarcodeLogError,
  type BarcodeFoodAction,
  type BarcodeLogRepository,
  type FoodSaveOutcome,
} from '@/features/barcode/repositories/barcodeLogRepository';
import type { FoodBarcodeLinkRepository } from '@/features/barcode/repositories/productCacheRepository';
import { validateProductReview, type ProductReviewDraft, type ProductReviewErrors } from '@/features/barcode/utils/productReviewDraft';
import type { FoodRepository } from '@/features/library/repositories/libraryRepositories';
import type { Food } from '@/features/library/types';
import type { Meal } from '@/features/meals/types';
import { validateDestination, type LogDestination } from '@/features/meals/utils/libraryEntries';
import type { LocalDateKey } from '@/utils/date';

export type FoodSaveChoice = { kind: 'none' } | { kind: 'create' } | { kind: 'keep_linked'; foodId: string } | { kind: 'update_linked'; foodId: string };

export type BarcodeSaveResult =
  | { status: 'saved'; meal: Meal; food: Food | null; foodOutcome: FoodSaveOutcome; replayed: boolean }
  | { status: 'invalid'; errors: ProductReviewErrors | null; message: string }
  | { status: 'failed'; code: BarcodeLogError['code']; message: string };

export type BarcodeLogService = ReturnType<typeof createBarcodeLogService>;

export function createBarcodeLogService({
  repository,
  foods,
  links,
}: {
  repository: BarcodeLogRepository;
  foods: Pick<FoodRepository, 'getFood'>;
  links: Pick<FoodBarcodeLinkRepository, 'getLinkedFoodId'>;
}) {
  return {
    getLinkedFood: async (barcode: string): Promise<Food | null> => {
      try {
        const foodId = await links.getLinkedFoodId(barcode);
        return foodId === null ? null : await foods.getFood(foodId);
      } catch {
        return null;
      }
    },

    save: async ({
      operationId,
      draft,
      destination,
      todayKey,
      foodChoice,
    }: {
      operationId: string;
      draft: ProductReviewDraft;
      destination: LogDestination;
      todayKey: LocalDateKey;
      foodChoice: FoodSaveChoice;
    }): Promise<BarcodeSaveResult> => {
      const destinationError = validateDestination(destination, todayKey);
      if (destinationError) {
        return { status: 'invalid', errors: null, message: destinationError };
      }
      const review = validateProductReview(draft);
      if (!review.ok) {
        return { status: 'invalid', errors: review.errors, message: review.errors.form ?? 'Fix the highlighted fields before adding this product.' };
      }
      const value = review.value;
      const foodInput = { name: value.name, serving: { ...value.serving }, nutrition: { ...value.baseNutrition } };
      const foodAction: BarcodeFoodAction =
        foodChoice.kind === 'create'
          ? { kind: 'create', input: foodInput }
          : foodChoice.kind === 'update_linked'
            ? { kind: 'update_linked', foodId: foodChoice.foodId, input: foodInput }
            : foodChoice;
      try {
        const result = await repository.commit({
          operationId,
          meal: { name: value.name, ...value.consumed, mealType: destination.mealType, date: destination.date, time: null },
          source: {
            sourceType: 'product',
            provider: draft.product.provider,
            barcode: draft.product.barcode,
            providerProductName: draft.product.name,
            itemName: value.name,
            serving: { ...value.serving },
            baseNutrition: { ...value.baseNutrition },
            amount: value.amount,
            userReviewed: value.userReviewed,
            lookedUpAt: draft.fetchedAt,
            providerModifiedAt: draft.product.providerModifiedAt,
          },
          foodAction,
        });
        return { status: 'saved', ...result };
      } catch (error) {
        const code = error instanceof BarcodeLogError ? error.code : 'write_failed';
        return { status: 'failed', code, message: BARCODE_LOG_MESSAGES[code] };
      }
    },
  };
}
