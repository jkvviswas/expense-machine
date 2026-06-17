import { useSyncExternalStore } from 'react';
import type { Category } from '../transactions/types';

/**
 * ============================================================================
 *  BUDGET STORE — single source of truth for monthly category caps.
 * ============================================================================
 * Both the Budgets module and the Dashboard's budgetHealth() read caps from
 * HERE. That is the integration seam: when a user edits a budget, the change
 * lands in this store and the Dashboard (Budget Health, and later Safe to
 * Spend) reflects it automatically — no separate dataset, no duplication.
 *
 * In-memory for V1 (consistent with the rest of the product). The async-ready
 * shape mirrors how a real backend / Supabase row would later plug in.
 *
 * IMPORTANT: the seed values below are byte-identical to the soft caps that
 * previously lived in derive.ts, so existing Dashboard figures do not change.
 */

export type BudgetMap = Partial<Record<Category, number>>;

const SEED: BudgetMap = {
  Food: 12000,
  Transport: 6000,
  Shopping: 15000,
  Utilities: 35000,
  Entertainment: 4000,
  Healthcare: 8000,
};

let caps: BudgetMap = { ...SEED };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const budgetStore = {
  getCaps(): BudgetMap {
    return caps;
  },
  getCap(category: Category): number | undefined {
    return caps[category];
  },
  setCap(category: Category, amount: number) {
    caps = { ...caps, [category]: Math.max(0, Math.round(amount)) };
    emit();
  },
  removeCap(category: Category) {
    const next = { ...caps };
    delete next[category];
    caps = next;
    emit();
  },
  reset() {
    caps = { ...SEED };
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** React hook: re-renders when any cap changes. */
export function useBudgets(): BudgetMap {
  return useSyncExternalStore(budgetStore.subscribe, budgetStore.getCaps, budgetStore.getCaps);
}
