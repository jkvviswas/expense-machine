import { useSyncExternalStore } from 'react';

/**
 * A tiny global toast for destructive actions. A delete pushes a toast with an
 * Undo callback; if the user doesn't undo within the window it simply expires
 * (the soft-deleted item stays in Trash regardless, so nothing is lost). One
 * toast at a time — a new action replaces the previous.
 */

export interface UndoToast {
  id: number;
  message: string;
  onUndo: () => void;
}

let current: UndoToast | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const toastStore = {
  show(message: string, onUndo: () => void, ms = 6000) {
    if (timer) clearTimeout(timer);
    current = { id: ++seq, message, onUndo };
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
  undo() {
    if (!current) return;
    const { onUndo } = current;
    if (timer) clearTimeout(timer);
    current = null;
    emit();
    onUndo();
  },
  get() {
    return current;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useToast(): UndoToast | null {
  return useSyncExternalStore(toastStore.subscribe, toastStore.get, () => null);
}
