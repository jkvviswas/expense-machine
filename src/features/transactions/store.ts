import { useSyncExternalStore } from 'react';
import type { Category, Transaction, PaymentMethod } from './types';
import type { ParsedTransaction } from '../import/types';
import { fetchTransactions } from './data';
import { persist, STORAGE_KEYS } from '../../lib/persist';
import { merchantRules, normMerchant } from './merchantRules';
import { generateId } from '../../lib/id';

/**
 * ============================================================================
 *  TRANSACTIONS STORE  (additive persistence layer — NOT a calculation file)
 * ============================================================================
 *
 * The locked ledger (`transactions/data.ts`) remains the canonical SEED. This
 * store holds the user's WORKING COPY of the ledger: the seed plus any category
 * edits and any transactions imported through the Import Center. It persists to
 * localStorage so edits and imports survive a refresh.
 *
 * It deliberately does NOT change any calculation: the Transactions page still
 * runs the locked `applyFilters` / `totals`, the Dashboard still uses its locked
 * derivations. Those functions take a Transaction[] argument; this store simply
 * supplies a persisted array instead of a throwaway in-memory one. Same shape,
 * same math.
 *
 * Hydration order:
 *   1. If localStorage has a saved ledger → use it (preserves user edits).
 *   2. Otherwise → seed from the locked `fetchTransactions()` once, then persist.
 */

type Listener = () => void;

/** A soft-deleted transaction with the time it was trashed (for retention). */
export interface TrashedTransaction {
  txn: Transaction;
  deletedAt: number; // epoch ms
}

/** Trash retention window — items auto-purge after this many days. */
export const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Whole days remaining before a trashed item is permanently removed. */
export function trashDaysRemaining(deletedAt: number, now = Date.now()): number {
  const elapsed = now - deletedAt;
  return Math.max(0, Math.ceil((TRASH_RETENTION_MS - elapsed) / (24 * 60 * 60 * 1000)));
}

/** Drop trash entries past the retention window. Returns true if anything changed. */
function pruneTrash(): boolean {
  const cutoff = Date.now() - TRASH_RETENTION_MS;
  const before = trash.length;
  trash = trash.filter((e) => e.deletedAt > cutoff);
  return trash.length !== before;
}

let ledger: Transaction[] | null = null;
let trash: TrashedTransaction[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function save() {
  if (ledger) persist.write(STORAGE_KEYS.transactions, ledger);
}

function saveTrash() {
  persist.write(STORAGE_KEYS.trash, trash);
}

/**
 * Ensure the ledger is loaded. Resolves from localStorage if present, else
 * seeds from the locked data source. Idempotent and concurrency-safe.
 */
export function ensureHydrated(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;

  hydrating = (async () => {
    const saved = persist.read<Transaction[] | null>(STORAGE_KEYS.transactions, null);
    trash = persist.read<TrashedTransaction[]>(STORAGE_KEYS.trash, []) ?? [];
    if (pruneTrash()) saveTrash();
    if (saved && Array.isArray(saved)) {
      // Any persisted ledger (including an explicit empty one) is respected.
      ledger = saved;
    } else {
      // No persisted ledger yet. Decide based on the onboarding choice:
      //  - sample opted-in OR a returning pre-onboarding user with legacy data
      //    → seed from the locked source and persist.
      //  - otherwise (new user mid-onboarding, or clean-start) → start EMPTY and
      //    do NOT persist, so the user's onboarding choice is the source of
      //    truth and there's no boot-time seed to clear later.
      const { onboardingStore } = await import('../onboarding/store');
      const shouldSeed = onboardingStore.hasSample();
      if (shouldSeed) {
        ledger = await fetchTransactions();
        save();
      } else {
        ledger = [];
        // Intentionally not persisted: onboarding finish() will set the final
        // state (empty for clean-start, seeded for sample).
      }
    }
    hydrated = true;
    emit();
  })();

  return hydrating;
}

const DEFAULT_PAYMENT: PaymentMethod = 'UPI';

/** Map an imported ParsedTransaction into a ledger Transaction. */
function fromParsed(p: ParsedTransaction, accountId: string): Transaction {
  // Apply any learned merchant→category rule on import.
  const learned = merchantRules.get(p.merchant);
  return {
    id: `imp-${Date.now().toString(36)}-${p.id}`,
    date: p.date,
    merchant: p.merchant,
    description: p.description,
    amount: p.amount,
    category: learned ?? p.category,
    accountId,
    paymentMethod: DEFAULT_PAYMENT,
    confidence: learned ? 1 : p.confidence,
    edited: p.edited,
    ...(p.narration ? { narration: p.narration } : {}),
    ...(p.runningBalance != null ? { runningBalance: p.runningBalance } : {}),
    ...(p.referenceNo ? { referenceNo: p.referenceNo } : {}),
    ...(p.transactionId ? { transactionId: p.transactionId } : {}),
    ...(p.upiRef ? { upiRef: p.upiRef } : {}),
    ...(p.maskedAccount ? { maskedAccount: p.maskedAccount } : {}),
    ...(p.ifsc ? { ifsc: p.ifsc } : {}),
  };
}

export const transactionsStore = {
  /** Current working ledger (empty until hydrated). */
  get(): Transaction[] {
    return ledger ?? [];
  },

  isHydrated(): boolean {
    return hydrated;
  },

  /** Update one transaction's category (persisted). */
  /** Add a manually-created transaction (behaves exactly like an imported one). */
  add(txn: Omit<Transaction, 'id'>): Transaction {
    if (!ledger) ledger = [];
    const learned = merchantRules.get(txn.merchant);
    const created: Transaction = {
      ...txn,
      category: txn.category ?? learned ?? 'Uncategorized',
      id: generateId('man'),
    };
    ledger = [created, ...ledger];
    save();
    emit();
    return created;
  },

  setCategory(id: string, category: Category) {
    if (!ledger) return;
    const target = ledger.find((t) => t.id === id);
    if (!target) return;
    // Remember this merchant→category mapping for current + future transactions.
    merchantRules.set(target.merchant, category);
    const key = normMerchant(target.merchant);
    ledger = ledger.map((t) => {
      if (t.id === id) return { ...t, category, edited: true, confidence: 1 };
      // Apply to other transactions of the same merchant that the user hasn't
      // already manually categorized (so we never override a deliberate choice).
      if (!t.edited && normMerchant(t.merchant) === key) {
        return { ...t, category, confidence: 1 };
      }
      return t;
    });
    save();
    emit();
  },

  /** Bulk category change (persisted). */
  setCategoryBulk(ids: string[], category: Category) {
    if (!ledger) return;
    const set = new Set(ids);
    ledger = ledger.map((t) =>
      set.has(t.id) ? { ...t, category, edited: true, confidence: 1 } : t,
    );
    save();
    emit();
  },

  /** Patch arbitrary editable fields from the detail drawer (persisted). */
  patch(id: string, patch: Partial<Transaction>) {
    if (!ledger) return;
    ledger = ledger.map((t) => (t.id === id ? { ...t, ...patch } : t));
    save();
    emit();
  },

  /**
   * Re-link every transaction on `oldAccountId` to `newAccountId`. Used by
   * account normalization to migrate orphan/imported activity onto a real
   * account record. Returns the number of transactions moved. History is fully
   * preserved — only the accountId changes.
   */
  relinkAccount(oldAccountId: string, newAccountId: string): number {
    if (!ledger) return 0;
    let moved = 0;
    ledger = ledger.map((t) => {
      if (t.accountId === oldAccountId) {
        moved += 1;
        return { ...t, accountId: newAccountId };
      }
      return t;
    });
    if (moved > 0) {
      save();
      emit();
    }
    return moved;
  },

  /** Commit a batch of imported transactions to the ledger (persisted). */
  addImported(parsed: ParsedTransaction[], accountId: string): number {
    if (!ledger) ledger = [];
    const incoming = parsed.map((p) => fromParsed(p, accountId));
    ledger = [...incoming, ...ledger];
    save();
    emit();
    return incoming.length;
  },

  /**
   * @deprecated Opening balance is now a single source of truth on the ACCOUNT
   * (`account.openingBalance`), not a ledger transaction. Creating an opening
   * entry here AND an account opening balance double-counts. Imports set the
   * account's openingBalance via normalizeImportedAccounts instead. Retained only
   * so any persisted legacy entries can still be read (they are folded into the
   * account and removed by normalization on load). Do not call for new flows.
   */
  addOpeningBalance(amount: number, date: string, accountId: string): boolean {
    if (!ledger) ledger = [];
    const exists = ledger.some(
      (t) => t.isSystemGenerated && t.accountId === accountId && t.date === date && t.amount === amount,
    );
    if (exists) return false;
    const entry: Transaction = {
      id: generateId('open'),
      date,
      merchant: 'Opening Balance',
      description: 'Statement opening balance',
      amount,
      category: 'Income',
      accountId,
      paymentMethod: DEFAULT_PAYMENT,
      confidence: 1,
      edited: true,
      isSystemGenerated: true,
    };
    ledger = [entry, ...ledger];
    save();
    emit();
    return true;
  },

  /** Reset the working ledger back to the locked seed (persisted). */
  async resetToSeed() {
    const seed = await fetchTransactions();
    ledger = seed;
    save();
    emit();
  },

  /** Replace the entire working ledger (used by restore-from-backup). */
  replaceAll(next: Transaction[]) {
    ledger = [...next];
    hydrated = true;
    save();
    emit();
  },

  // ---- Soft delete / Trash --------------------------------------------------

  /** Soft-delete one transaction → moves it to Trash (recoverable). */
  /**
   * Permanently remove a transaction (bypasses trash). Used by data migrations
   * where the row is being folded into another representation, not user-deleted.
   */
  hardRemove(id: string): boolean {
    if (!ledger) return false;
    const before = ledger.length;
    ledger = ledger.filter((t) => t.id !== id);
    if (ledger.length === before) return false;
    save();
    emit();
    return true;
  },

  remove(id: string) {
    if (!ledger) return;
    const found = ledger.find((t) => t.id === id);
    if (!found) return;
    ledger = ledger.filter((t) => t.id !== id);
    trash = [{ txn: found, deletedAt: Date.now() }, ...trash];
    save();
    saveTrash();
    emit();
  },

  /** Soft-delete many transactions at once. */
  removeBulk(ids: string[]) {
    if (!ledger) return;
    const set = new Set(ids);
    const removed = ledger.filter((t) => set.has(t.id));
    if (removed.length === 0) return;
    ledger = ledger.filter((t) => !set.has(t.id));
    const now = Date.now();
    trash = [...removed.map((txn) => ({ txn, deletedAt: now })), ...trash];
    save();
    saveTrash();
    emit();
  },

  /** Restore a trashed transaction back into the working ledger. */
  restore(id: string) {
    const entry = trash.find((e) => e.txn.id === id);
    if (!entry || !ledger) return;
    trash = trash.filter((e) => e.txn.id !== id);
    ledger = [entry.txn, ...ledger];
    save();
    saveTrash();
    emit();
  },

  /** Permanently delete one trashed transaction. */
  purge(id: string) {
    trash = trash.filter((e) => e.txn.id !== id);
    saveTrash();
    emit();
  },

  /** Empty the Trash permanently. */
  emptyTrash() {
    trash = [];
    saveTrash();
    emit();
  },

  /** Current Trash contents (most-recent first). */
  getTrash(): TrashedTransaction[] {
    return trash;
  },

  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/**
 * React hook for the working ledger. Triggers hydration on first use and
 * re-renders on any change. Returns `null` while still hydrating so callers can
 * show the existing loading skeleton.
 */
export function useLedger(): Transaction[] | null {
  const snapshot = useSyncExternalStore(
    transactionsStore.subscribe,
    () => (hydrated ? transactionsStore.get() : null),
    () => null,
  );
  if (!hydrated && !hydrating) {
    void ensureHydrated();
  }
  return snapshot;
}

/** Reactive Trash contents. */
export function useTrash(): TrashedTransaction[] {
  return useSyncExternalStore(
    transactionsStore.subscribe,
    () => transactionsStore.getTrash(),
    () => [],
  );
}
