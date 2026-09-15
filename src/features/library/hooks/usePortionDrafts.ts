import { useCallback, useRef, useState } from 'react';

import type { Food } from '@/features/library/types';
import { createPortionDraft, type PortionDraft } from '@/features/library/validation/portions';

export function usePortionDrafts(initial: PortionDraft[] = []) {
  const [items, setItems] = useState<PortionDraft[]>(initial);
  const counter = useRef(0);

  const add = useCallback((food: Food) => {
    counter.current += 1;
    setItems((current) => [...current, createPortionDraft(`new-${counter.current}`, food)]);
  }, []);

  const remove = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const changeAmount = useCallback((key: string, amountText: string) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, amountText } : item)));
  }, []);

  return { items, setItems, add, remove, changeAmount };
}
