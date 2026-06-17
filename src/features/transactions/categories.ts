import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';
import { CATEGORIES as BUILT_IN } from './types';
import type { Category } from './types';

/**
 * Custom category registry. Built-in categories live in the typed union; users
 * can add their own (stored as strings). The merged list drives every category
 * selector, filter, budget and report. Deleting a custom category never
 * corrupts transactions — callers reassign affected rows to 'Uncategorized'.
 */

export interface CustomCategory {
  name: string;
  archived?: boolean;
  /** Optional user-chosen accent color (hex). Falls back to auto-generated tone. */
  color?: string;
}

let custom: CustomCategory[] = persist.read<CustomCategory[]>(STORAGE_KEYS.categories, []) ?? [];
const listeners = new Set<() => void>();
const save = () => persist.write(STORAGE_KEYS.categories, custom);

/** Cached merged list — stable reference until categories actually change. */
let snapshot: string[] = [];
function rebuild() {
  // Phase 11 ordering: built-in categories first (excluding the trailing
  // Uncategorized), then user-created categories, then 'Uncategorized'
  // second-last, and 'Others' always last.
  const builtinsNoUncat = BUILT_IN.filter((c) => c !== 'Uncategorized' && c !== 'Others');
  const customNames = custom.filter((c) => !c.archived).map((c) => c.name);
  snapshot = [...builtinsNoUncat, ...customNames, 'Uncategorized', 'Others'];
}
const emit = () => {
  rebuild();
  listeners.forEach((l) => l());
};

function exists(name: string): boolean {
  const lc = name.trim().toLowerCase();
  return (
    BUILT_IN.some((c) => c.toLowerCase() === lc) ||
    custom.some((c) => c.name.toLowerCase() === lc)
  );
}

export const categoriesStore = {
  /** Active category names: built-ins + non-archived custom ones. */
  all(): string[] {
    return snapshot;
  },
  custom(): CustomCategory[] {
    return custom;
  },
  add(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed || exists(trimmed)) return false;
    custom = [{ name: trimmed }, ...custom];
    save();
    emit();
    return true;
  },
  rename(oldName: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed || exists(trimmed)) return false;
    custom = custom.map((c) => (c.name === oldName ? { ...c, name: trimmed } : c));
    save();
    emit();
    return true;
  },
  archive(name: string, archived = true) {
    custom = custom.map((c) => (c.name === name ? { ...c, archived } : c));
    save();
    emit();
  },
  setColor(name: string, color: string | undefined) {
    custom = custom.map((c) => (c.name === name ? { ...c, color } : c));
    save();
    emit();
  },
  remove(name: string) {
    custom = custom.filter((c) => c.name !== name);
    save();
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

// Build the initial snapshot once at module load.
rebuild();

const getAll = () => categoriesStore.all() as Category[];

/** Reactive merged category list (built-in + active custom), typed as Category. */
export function useAllCategories(): Category[] {
  return useSyncExternalStore(categoriesStore.subscribe, getAll, getAll);
}
