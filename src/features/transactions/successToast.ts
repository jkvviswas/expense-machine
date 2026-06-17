import { useSyncExternalStore } from 'react';

export interface SuccessToast {
  id: number;
  title: string;
  lines: string[];
}

let current: SuccessToast | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const successToastStore = {
  show(title: string, lines: string[], ms = 4500) {
    if (timer) clearTimeout(timer);
    current = { id: ++seq, title, lines };
    emit();
    timer = setTimeout(() => {
      current = null;
      emit();
    }, ms);
  },
  dismiss() {
    if (timer) clearTimeout(timer);
    current = null;
    emit();
  },
  get() {
    return current;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSuccessToast(): SuccessToast | null {
  return useSyncExternalStore(successToastStore.subscribe, successToastStore.get, () => null);
}
