import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';

/**
 * ============================================================================
 *  ONBOARDING STORE  (presentation-layer, additive)
 * ============================================================================
 *
 * Controls the first-launch experience. By default a brand-new user starts with
 * a CLEAN slate (no demo transactions, clients, or invoices) and is guided to
 * either import a real statement or load sample data to explore.
 *
 * IMPORTANT: the locked seed in transactions/data.ts is untouched. We don't
 * remove the seed — we gate whether it is loaded into the working ledger, via
 * the `sampleLoaded` flag the transaction/clients hydration consults. This keeps
 * the demo available on demand while giving new users an empty, professional
 * starting point.
 */

interface OnboardingState {
  /** True once the user has finished (or skipped) onboarding. */
  completed: boolean;
  /** True if the user chose to load the sample dataset. */
  sampleLoaded: boolean;
}

const KEY = 'onboarding';

let state: OnboardingState = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): OnboardingState {
  const saved = persist.read<OnboardingState | null>(KEY, null);
  if (saved && typeof saved.completed === 'boolean') return saved;
  // Migration: a user from before onboarding existed who already has a working
  // ledger should NOT be sent through onboarding. Treat existing data as a
  // completed setup (with sample considered loaded so nothing is wiped).
  const existing = persist.read<unknown[] | null>(STORAGE_KEYS.transactions, null);
  if (Array.isArray(existing) && existing.length > 0) {
    const migrated = { completed: true, sampleLoaded: true };
    persist.write(KEY, migrated);
    return migrated;
  }
  return { completed: false, sampleLoaded: false };
}
function save() {
  persist.write(KEY, state);
}

export const onboardingStore = {
  get: (): OnboardingState => state,
  isCompleted: (): boolean => state.completed,
  hasSample: (): boolean => state.sampleLoaded,
  complete(sampleLoaded: boolean) {
    state = { completed: true, sampleLoaded };
    save();
    emit();
  },
  setSampleLoaded(v: boolean) {
    state = { ...state, sampleLoaded: v };
    save();
    emit();
  },
  reset() {
    state = { completed: false, sampleLoaded: false };
    save();
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore(onboardingStore.subscribe, onboardingStore.get, onboardingStore.get);
}
