import type { Category } from '../transactions/types';
import { budgetStore, type BudgetMap } from './store';
import { persist, STORAGE_KEYS } from '../../lib/persist';

/**
 * ============================================================================
 *  BUDGETS PERSISTENCE  (additive — does NOT modify the locked store)
 * ============================================================================
 *
 * `budgets/store.ts` is a LOCKED file and cannot itself read/write storage. To
 * persist budget caps without touching it, this module wraps the store's PUBLIC
 * API only:
 *   - On boot, `hydrateBudgets()` reads saved caps and replays them through the
 *     public `setCap` / `removeCap` methods (so the store's own emit/seed logic
 *     is fully respected).
 *   - It then subscribes to the store and writes the latest caps on any change.
 *
 * The locked file's bytes are unchanged; this is pure composition over its
 * existing interface. Calculations are untouched — the same caps drive the same
 * locked budget math.
 */

let started = false;

export function hydrateBudgets(): void {
  if (started) return;
  started = true;

  const saved = persist.read<BudgetMap | null>(STORAGE_KEYS.budgets, null);
  if (saved && typeof saved === 'object') {
    // Replay saved caps through the public API. Remove any seeded category the
    // user had deleted (i.e. present in seed/current but absent from saved).
    const current = budgetStore.getCaps();
    (Object.keys(current) as Category[]).forEach((cat) => {
      if (!(cat in saved)) budgetStore.removeCap(cat);
    });
    (Object.keys(saved) as Category[]).forEach((cat) => {
      const amount = saved[cat];
      if (typeof amount === 'number') budgetStore.setCap(cat, amount);
    });
  } else {
    // FRESH INSTALL: the app must never invent financial targets. Clear the
    // store's seeded caps so a new user starts with zero budgets, then persist
    // that empty state. Budgets exist only once the user creates them.
    const current = budgetStore.getCaps();
    (Object.keys(current) as Category[]).forEach((cat) => budgetStore.removeCap(cat));
    persist.write(STORAGE_KEYS.budgets, budgetStore.getCaps());
  }

  // Persist on every future change.
  budgetStore.subscribe(() => {
    persist.write(STORAGE_KEYS.budgets, budgetStore.getCaps());
  });
}
