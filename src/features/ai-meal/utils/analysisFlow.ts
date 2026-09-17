import type { AiErrorCode, AiInputKind } from '@/features/ai-meal/types';
import type { AiReviewDraft } from '@/features/ai-meal/utils/reviewDraft';

export type AiFlowState =
  | { phase: 'compose'; requestId: number }
  | { phase: 'analyzing'; requestId: number; inputKind: AiInputKind }
  | { phase: 'review'; requestId: number; draft: AiReviewDraft }
  | { phase: 'clarify'; requestId: number; inputKind: AiInputKind; question: string }
  | { phase: 'error'; requestId: number; code: AiErrorCode; serverMessage: string | null; retryAfterSeconds: number | null };

export type AiFlowAction =
  | { type: 'start'; requestId: number; inputKind: AiInputKind }
  | { type: 'succeed'; requestId: number; draft: AiReviewDraft }
  | { type: 'clarify'; requestId: number; question: string }
  | { type: 'fail'; requestId: number; code: AiErrorCode; serverMessage: string | null; retryAfterSeconds: number | null }
  | { type: 'cancel'; requestId: number }
  | { type: 'edit'; update: (draft: AiReviewDraft) => AiReviewDraft }
  | { type: 'reset' };

export const INITIAL_AI_FLOW_STATE: AiFlowState = { phase: 'compose', requestId: 0 };

export function aiFlowReducer(state: AiFlowState, action: AiFlowAction): AiFlowState {
  switch (action.type) {
    case 'start':
      return action.requestId > state.requestId
        ? { phase: 'analyzing', requestId: action.requestId, inputKind: action.inputKind }
        : state;
    case 'succeed':
      return state.phase === 'analyzing' && state.requestId === action.requestId
        ? { phase: 'review', requestId: action.requestId, draft: action.draft }
        : state;
    case 'clarify':
      return state.phase === 'analyzing' && state.requestId === action.requestId
        ? { phase: 'clarify', requestId: action.requestId, inputKind: state.inputKind, question: action.question }
        : state;
    case 'fail':
      return state.phase === 'analyzing' && state.requestId === action.requestId
        ? {
            phase: 'error',
            requestId: action.requestId,
            code: action.code,
            serverMessage: action.serverMessage,
            retryAfterSeconds: action.retryAfterSeconds,
          }
        : state;
    case 'cancel':
      return state.phase === 'analyzing' && state.requestId === action.requestId
        ? { phase: 'compose', requestId: state.requestId }
        : state;
    case 'edit':
      return state.phase === 'review' ? { ...state, draft: action.update(state.draft) } : state;
    case 'reset':
      return { phase: 'compose', requestId: state.requestId };
  }
}
