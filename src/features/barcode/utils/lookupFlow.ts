import type { LookupResult } from '@/features/barcode/types';
import type { ProductReviewDraft } from '@/features/barcode/utils/productReviewDraft';

export type BarcodeFlowState =
  | { phase: 'entry'; requestId: number }
  | { phase: 'looking_up'; requestId: number; barcode: string }
  | { phase: 'review'; requestId: number; barcode: string; draft: ProductReviewDraft }
  | { phase: 'not_found'; requestId: number; barcode: string; fromCache: boolean }
  | { phase: 'failed'; requestId: number; barcode: string; result: Extract<LookupResult, { status: 'failed' }> };

export type BarcodeFlowAction =
  | { type: 'start'; requestId: number; barcode: string }
  | { type: 'review'; requestId: number; draft: ProductReviewDraft }
  | { type: 'not_found'; requestId: number; fromCache: boolean }
  | { type: 'fail'; requestId: number; result: Extract<LookupResult, { status: 'failed' }> }
  | { type: 'cancel'; requestId: number }
  | { type: 'edit'; update: (draft: ProductReviewDraft) => ProductReviewDraft }
  | { type: 'reset' };

export const INITIAL_BARCODE_FLOW_STATE: BarcodeFlowState = { phase: 'entry', requestId: 0 };

export function barcodeFlowReducer(state: BarcodeFlowState, action: BarcodeFlowAction): BarcodeFlowState {
  switch (action.type) {
    case 'start':
      return action.requestId > state.requestId ? { phase: 'looking_up', requestId: action.requestId, barcode: action.barcode } : state;
    case 'review':
      return state.phase === 'looking_up' && state.requestId === action.requestId
        ? { phase: 'review', requestId: state.requestId, barcode: state.barcode, draft: action.draft }
        : state;
    case 'not_found':
      return state.phase === 'looking_up' && state.requestId === action.requestId
        ? { phase: 'not_found', requestId: state.requestId, barcode: state.barcode, fromCache: action.fromCache }
        : state;
    case 'fail':
      return state.phase === 'looking_up' && state.requestId === action.requestId
        ? { phase: 'failed', requestId: state.requestId, barcode: state.barcode, result: action.result }
        : state;
    case 'cancel':
      return state.phase === 'looking_up' && state.requestId === action.requestId ? { phase: 'entry', requestId: state.requestId } : state;
    case 'edit':
      return state.phase === 'review' ? { ...state, draft: action.update(state.draft) } : state;
    case 'reset':
      return { phase: 'entry', requestId: state.requestId };
  }
}

export function createScanGate() {
  let locked = false;
  return {
    tryLock: (): boolean => {
      if (locked) {
        return false;
      }
      locked = true;
      return true;
    },
    unlock: () => {
      locked = false;
    },
    isLocked: () => locked,
  };
}
