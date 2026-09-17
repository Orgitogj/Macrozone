import * as Haptics from 'expo-haptics';
import { useEffect, useReducer, useRef, useState } from 'react';

import type { PhotoSource } from '@/features/ai-meal/adapters/photoAdapter';
import { AI_LIMITS, AI_PHOTO_DISCLOSURE } from '@/features/ai-meal/constants';
import { getAiMealService, getPhotoAdapter } from '@/features/ai-meal/services/getAiMealService';
import type { AiAnalysisInput, AiInputKind, PreparedPhoto } from '@/features/ai-meal/types';
import { aiFlowReducer, INITIAL_AI_FLOW_STATE } from '@/features/ai-meal/utils/analysisFlow';
import { createPhotoSession, type PhotoSession } from '@/features/ai-meal/utils/photoSession';
import { createBlankReviewItem, type AiReviewDraft, type AiReviewItem } from '@/features/ai-meal/utils/reviewDraft';
import { normalizeMealText, validateMealText } from '@/features/ai-meal/validation/textInput';
import type { Meal } from '@/features/meals/types';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { confirmDestructiveAction } from '@/utils/confirm';
import type { LocalDateKey } from '@/utils/date';
import { createSingleFlight } from '@/utils/singleFlight';

export type PhotoNotice =
  | { kind: 'permission'; canAskAgain: boolean }
  | { kind: 'error'; message: string }
  | null;

export type SaveFeedback = {
  message: string | null;
  titleError: string | null;
  listError: string | null;
  itemErrors: Record<string, string>;
};

const NO_SAVE_FEEDBACK: SaveFeedback = { message: null, titleError: null, listError: null, itemErrors: {} };

export function useAiMealFlow(initialInput: AiInputKind) {
  const [service] = useState(getAiMealService);
  const [photos] = useState(getPhotoAdapter);
  const [state, dispatch] = useReducer(aiFlowReducer, INITIAL_AI_FLOW_STATE);
  const [inputKind, setInputKind] = useState<AiInputKind>(initialInput);
  const [text, setText] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoNotice, setPhotoNotice] = useState<PhotoNotice>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(NO_SAVE_FEEDBACK);
  const [analyzeFlight] = useState(createSingleFlight);
  const [saveFlight] = useState(createSingleFlight);
  const [photoFlight] = useState(createSingleFlight);
  const requestCounter = useRef(0);
  const itemCounter = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<PhotoSession | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const session = createPhotoSession((uri) => photos.discard(uri));
    sessionRef.current = session;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      session.dispose();
      sessionRef.current = null;
    };
  }, [photos]);

  const acceptPhoto = (next: PreparedPhoto) => {
    const session = sessionRef.current;
    if (session === null) {
      photos.discard(next.uri);
      return;
    }
    if (session.accept(next)) {
      setPhoto(next);
    }
  };

  const clearPhoto = () => {
    sessionRef.current?.clear();
    setPhoto(null);
  };

  const choosePhoto = (source: PhotoSource) =>
    photoFlight.run(async () => {
      setIsPickingPhoto(true);
      setPhotoNotice(null);
      try {
        const result = await photos.pick(source);
        if (!mountedRef.current) {
          if (result.status === 'picked') {
            photos.discard(result.photo.uri);
          }
          return;
        }
        switch (result.status) {
          case 'picked':
            acceptPhoto(result.photo);
            clearError();
            break;
          case 'cancelled':
            break;
          case 'permission_denied':
            setPhotoNotice({ kind: 'permission', canAskAgain: result.canAskAgain });
            break;
          case 'invalid':
          case 'failed':
            setPhotoNotice({ kind: 'error', message: result.message });
            break;
        }
      } finally {
        if (mountedRef.current) {
          setIsPickingPhoto(false);
        }
      }
    });

  const removePhoto = () => {
    clearPhoto();
    setPhotoNotice(null);
  };

  const buildInput = (): AiAnalysisInput | null => {
    if (inputKind === 'text') {
      const validation = validateMealText(text);
      if (!validation.ok) {
        setTextError(validation.error);
        return null;
      }
      setTextError(null);
      return { kind: 'text', text: validation.text };
    }
    const current = sessionRef.current?.current() ?? null;
    if (current === null) {
      setPhotoNotice({ kind: 'error', message: 'Take or choose a photo first.' });
      return null;
    }
    const note = normalizeMealText(photoNote).slice(0, AI_LIMITS.maxPhotoNoteLength);
    return { kind: 'photo', photo: current, note: note.length > 0 ? note : null };
  };

  const runAnalysis = async () => {
    const input = buildInput();
    if (input === null) {
      return;
    }
    if (input.kind === 'photo' && (await service.needsPhotoDisclosure())) {
      const accepted = await confirmDestructiveAction({ ...AI_PHOTO_DISCLOSURE, destructive: false });
      if (!accepted || !mountedRef.current) {
        return;
      }
      try {
        await service.acknowledgePhotoDisclosure();
      } catch {
        setPhotoNotice({ kind: 'error', message: 'Your choice could not be saved on this device. Try again.' });
        return;
      }
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestCounter.current;
    dispatch({ type: 'start', requestId, inputKind: input.kind });
    setSaveFeedback(NO_SAVE_FEEDBACK);

    const outcome = await service.analyze(input, controller.signal);
    if (!mountedRef.current || requestId !== requestCounter.current) {
      return;
    }
    if (outcome.status === 'cancelled') {
      dispatch({ type: 'cancel', requestId });
      return;
    }
    if (outcome.status === 'error') {
      dispatch({
        type: 'fail',
        requestId,
        code: outcome.code,
        serverMessage: outcome.serverMessage,
        retryAfterSeconds: outcome.retryAfterSeconds,
      });
      return;
    }
    if (outcome.status === 'clarification') {
      dispatch({ type: 'clarify', requestId, question: outcome.question });
      return;
    }
    const draft = await service.buildReviewDraft(outcome.analysis);
    if (!mountedRef.current || requestId !== requestCounter.current || controller.signal.aborted) {
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({ type: 'succeed', requestId, draft });
  };

  const analyze = () => analyzeFlight.run(runAnalysis);

  const retryAnalysis = () =>
    analyzeFlight.run(async () => {
      if (state.phase === 'review') {
        const confirmed = await confirmDestructiveAction({
          title: 'Analyze Again?',
          message: 'A new estimate will replace this one, including any changes you made.',
          confirmLabel: 'Analyze Again',
          destructive: false,
        });
        if (!confirmed || !mountedRef.current) {
          return;
        }
      }
      await runAnalysis();
    });

  const cancel = () => {
    controllerRef.current?.abort();
    dispatch({ type: 'cancel', requestId: requestCounter.current });
  };

  const editInput = () => {
    controllerRef.current?.abort();
    requestCounter.current += 1;
    setSaveFeedback(NO_SAVE_FEEDBACK);
    dispatch({ type: 'reset' });
  };

  const clearError = () => {
    if (state.phase === 'error') {
      dispatch({ type: 'reset' });
    }
  };

  const editDraft = (update: (draft: AiReviewDraft) => AiReviewDraft) => {
    dispatch({ type: 'edit', update });
    setSaveFeedback(NO_SAVE_FEEDBACK);
  };

  const editItem = (key: string, update: (item: AiReviewItem) => AiReviewItem) =>
    editDraft((draft) => ({ ...draft, items: draft.items.map((item) => (item.key === key ? update(item) : item)) }));

  const removeItem = (key: string) => editDraft((draft) => ({ ...draft, items: draft.items.filter((item) => item.key !== key) }));

  const addItem = () => {
    const key = `added-${++itemCounter.current}`;
    editDraft((draft) =>
      draft.items.length >= AI_LIMITS.maxItems ? draft : { ...draft, items: [...draft.items, createBlankReviewItem(key)] },
    );
  };

  const save = (destination: LogDestination, todayKey: LocalDateKey, onSaved: (meals: Meal[]) => void) =>
    saveFlight.run(async () => {
      if (state.phase !== 'review') {
        return;
      }
      setIsSaving(true);
      try {
        const result = await service.save({ draft: state.draft, destination, todayKey });
        if (!mountedRef.current) {
          return;
        }
        if (result.status === 'saved') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearPhoto();
          onSaved(result.meals);
          return;
        }
        setSaveFeedback(
          result.status === 'invalid'
            ? { message: result.message, titleError: result.titleError, listError: result.listError, itemErrors: result.itemErrors }
            : { ...NO_SAVE_FEEDBACK, message: result.message },
        );
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    });

  return {
    state,
    isConfigured: service.isConfigured(),
    inputKind,
    setInputKind: (kind: AiInputKind) => {
      setInputKind(kind);
      clearError();
    },
    text,
    setText: (value: string) => {
      setText(value);
      setTextError(null);
      clearError();
    },
    textError,
    photoNote,
    setPhotoNote: (value: string) => {
      setPhotoNote(value);
      clearError();
    },
    photo,
    photoNotice,
    isPickingPhoto,
    isCameraAvailable: photos.isCameraAvailable(),
    choosePhoto: (source: PhotoSource) => void choosePhoto(source),
    removePhoto,
    openSettings: () => void photos.openSettings(),
    analyze: () => void analyze(),
    retryAnalysis: () => void retryAnalysis(),
    cancel,
    editInput,
    editDraft,
    editItem,
    removeItem,
    addItem,
    isSaving,
    saveFeedback,
    save,
  };
}
