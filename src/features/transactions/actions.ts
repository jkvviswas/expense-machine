import { transactionsStore } from './store';
import { toastStore } from './toast';
import type { Transaction } from './types';

/**
 * Soft-delete a single transaction and surface an Undo toast. The item goes to
 * Trash immediately (recoverable there even after the toast expires); Undo
 * restores it straight back into the ledger. Every derived view (Dashboard,
 * Reports, Analytics, Budgets, Cashflow) recomputes instantly because they all
 * subscribe to the same ledger store.
 */
export function deleteTransactionWithUndo(txn: Transaction) {
  transactionsStore.remove(txn.id);
  toastStore.show(`Deleted “${txn.merchant}”`, () => transactionsStore.restore(txn.id));
}

/** Soft-delete many transactions at once, with a single Undo for the batch. */
export function deleteManyWithUndo(ids: string[]) {
  if (ids.length === 0) return;
  transactionsStore.removeBulk(ids);
  toastStore.show(
    `Deleted ${ids.length} transaction${ids.length === 1 ? '' : 's'}`,
    () => ids.forEach((id) => transactionsStore.restore(id)),
  );
}
