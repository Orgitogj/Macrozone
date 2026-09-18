import * as Haptics from 'expo-haptics';
import { useEffect, useReducer, useRef, useState } from 'react';

import { getBarcodeServices } from '@/features/barcode/services/getBarcodeServices';
import type { BarcodeSaveResult } from '@/features/barcode/services/barcodeLogService';
import { barcodeFlowReducer, INITIAL_BARCODE_FLOW_STATE } from '@/features/barcode/utils/lookupFlow';
import { normalizeManualBarcode, type BarcodeFailureReason } from '@/features/barcode/utils/gtin';
import { createProductReviewDraft, type ProductReviewDraft, type ProductReviewErrors } from '@/features/barcode/utils/productReviewDraft';
import { createSaveOperationTracker, resolveFoodSaveChoice, type FoodDecision } from '@/features/barcode/utils/saveOperation';
import type { Food } from '@/features/library/types';
import type { Meal } from '@/features/meals/types';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { confirmDestructiveAction } from '@/utils/confirm';
import type { LocalDateKey } from '@/utils/date';
import { createId } from '@/utils/id';
import { createSingleFlight } from '@/utils/singleFlight';

export type LinkedFoodState = { status: 'loading' } | { status: 'ready'; food: Food | null };

export type { FoodDecision };

export function useBarcodeFlow() {
  const [services] = useState(getBarcodeServices);
  const [state, dispatch] = useReducer(barcodeFlowReducer, INITIAL_BARCODE_FLOW_STATE);
  const [manualText, setManualText] = useState('');
  const [manualError, setManualError] = useState<BarcodeFailureReason | null>(null);
  const [linkedFood, setLinkedFood] = useState<LinkedFoodState>({ status: 'ready', food: null });
  const [foodDecision, setFoodDecision] = useState<FoodDecision>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [reviewErrors, setReviewErrors] = useState<ProductReviewErrors | null>(null);
  const [saveFlight] = useState(createSingleFlight);
  const requestCounter = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [operations] = useState(() => createSaveOperationTracker(createId));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const loadLinkedFood = async (barcode: string, requestId: number) => {
    setLinkedFood({ status: 'loading' });
    const food = await services.log.getLinkedFood(barcode);
    if (!mountedRef.current || requestId !== requestCounter.current) {
      return;
    }
    setLinkedFood({ status: 'ready', food });
    setFoodDecision(food === null ? 'none' : 'keep');
  };

  const lookup = async (barcode: string, forceRefresh: boolean) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestCounter.current;
    dispatch({ type: 'start', requestId, barcode });
    setSaveMessage(null);
    setReviewErrors(null);
    const result = await services.lookup.lookup(barcode, { signal: controller.signal, forceRefresh });
    if (!mountedRef.current || requestId !== requestCounter.current) {
      return;
    }
    switch (result.status) {
      case 'found':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dispatch({ type: 'review', requestId, draft: createProductReviewDraft(result.product, { fetchedAt: result.fetchedAt, stale: result.stale }) });
        void loadLinkedFood(barcode, requestId);
        break;
      case 'not_found':
        dispatch({ type: 'not_found', requestId, fromCache: result.origin === 'cache' });
        break;
      case 'failed':
        if (result.code === 'cancelled') {
          dispatch({ type: 'cancel', requestId });
        } else {
          dispatch({ type: 'fail', requestId, result });
        }
        break;
    }
  };

  const submitManual = () => {
    const normalized = normalizeManualBarcode(manualText);
    if (!normalized.ok) {
      setManualError(normalized.reason);
      return;
    }
    setManualError(null);
    void lookup(normalized.value.barcode, false);
  };

  const openExpiredCache = () => {
    if (state.phase !== 'failed' || state.result.expiredCache === null) {
      return;
    }
    const requestId = ++requestCounter.current;
    const { product, fetchedAt } = state.result.expiredCache;
    dispatch({ type: 'start', requestId, barcode: state.barcode });
    dispatch({ type: 'review', requestId, draft: createProductReviewDraft(product, { fetchedAt, stale: true }) });
    void loadLinkedFood(state.barcode, requestId);
  };

  const cancel = () => {
    controllerRef.current?.abort();
    dispatch({ type: 'cancel', requestId: requestCounter.current });
  };

  const reset = () => {
    controllerRef.current?.abort();
    requestCounter.current += 1;
    setSaveMessage(null);
    setReviewErrors(null);
    setLinkedFood({ status: 'ready', food: null });
    setFoodDecision('none');
    dispatch({ type: 'reset' });
  };

  const editDraft = (update: (draft: ProductReviewDraft) => ProductReviewDraft) => {
    dispatch({ type: 'edit', update });
    setSaveMessage(null);
    setReviewErrors(null);
  };

  const save = (destination: LogDestination, todayKey: LocalDateKey, onSaved: (meal: Meal) => void) =>
    saveFlight.run(async () => {
      if (state.phase !== 'review') {
        return;
      }
      const foodChoice = await resolveFoodSaveChoice({
        linkedFood: linkedFood.status === 'ready' ? linkedFood.food : null,
        decision: foodDecision,
        confirmUpdate: (food) =>
          confirmDestructiveAction({
            title: 'Update Your Food?',
            message: `“${food.name}” in My Foods will use these reviewed values. Meals you already logged will not change.`,
            confirmLabel: 'Update Food',
            destructive: false,
          }),
      });
      if (foodChoice === null || !mountedRef.current) {
        return;
      }
      const operationId = operations.idFor({
        barcode: state.draft.product.barcode,
        fetchedAt: state.draft.fetchedAt,
        name: state.draft.name,
        basisId: state.draft.basisId,
        manualUnit: state.draft.manualUnit,
        amountText: state.draft.amountText,
        nutritionText: state.draft.nutritionText,
        destination,
        foodChoice,
      });
      setIsSaving(true);
      setSaveMessage(null);
      let result: BarcodeSaveResult;
      try {
        result = await services.log.save({ operationId, draft: state.draft, destination, todayKey, foodChoice });
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
      if (!mountedRef.current) {
        return;
      }
      switch (result.status) {
        case 'saved':
          operations.reset();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSaved(result.meal);
          break;
        case 'invalid':
          setReviewErrors(result.errors);
          setSaveMessage(result.message);
          break;
        case 'failed':
          setSaveMessage(result.message);
          if (result.code === 'linked_food_missing' || result.code === 'barcode_linked_elsewhere') {
            operations.reset();
            void loadLinkedFood(state.barcode, requestCounter.current);
          }
          break;
      }
    });

  return {
    state,
    availability: services.lookup.availability(),
    manualText,
    setManualText: (value: string) => {
      setManualText(value);
      setManualError(null);
    },
    manualError,
    submitManual,
    lookupBarcode: (barcode: string) => void lookup(barcode, false),
    retry: () => {
      if (state.phase === 'failed' || state.phase === 'not_found' || state.phase === 'review') {
        void lookup(state.barcode, true);
      }
    },
    openExpiredCache,
    cancel,
    reset,
    editDraft,
    linkedFood,
    foodDecision,
    setFoodDecision,
    isSaving,
    saveMessage,
    reviewErrors,
    save,
  };
}
