import { useSyncExternalStore } from 'react';
import type { RecentImport } from '../types';
import { persist, STORAGE_KEYS } from '../../../lib/persist';
import { generateId } from '../../../lib/id';

/**
 * ============================================================================
 *  IMPORT HISTORY STORE  (additive persistence layer)
 * ============================================================================
 *
 * Tracks statements the user has imported, persisted across refreshes. Seeded
 * once with the believable demo history; every real import through the Import
 * Center prepends a genuine entry. Presentation-only — no calculation impact.
 */

type Listener = () => void;

let history: RecentImport[] | null = null;
const listeners = new Set<Listener>();

function load(): RecentImport[] {
  if (history) return history;
  history = persist.read<RecentImport[]>(STORAGE_KEYS.importHistory, []);
  return history;
}

function save() {
  if (history) persist.write(STORAGE_KEYS.importHistory, history);
}

function emit() {
  for (const l of listeners) l();
}

export const importHistoryStore = {
  get(): RecentImport[] {
    return load();
  },

  add(entry: Omit<RecentImport, 'id' | 'importedOn' | 'status'> & { status?: RecentImport['status'] }) {
    const list = load();
    const now = new Date();
    const item: RecentImport = {
      id: generateId('imp'),
      importedOn: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' \u2022 '
        + now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
      status: entry.status ?? 'completed',
      fileName: entry.fileName,
      fileType: entry.fileType,
      transactionCount: entry.transactionCount,
      ...(entry.bankName ? { bankName: entry.bankName } : {}),
    };
    history = [item, ...list].slice(0, 12);
    save();
    emit();
  },

  /** Remove a single history record. Does not touch ledger/accounts/categories/budgets. */
  remove(id: string) {
    history = load().filter((r) => r.id !== id);
    save();
    emit();
  },

  /** Clear all import history records. Does not touch ledger/accounts/categories/budgets. */
  clearHistory() {
    history = [];
    save();
    emit();
  },

  reset() {
    history = [];
    save();
    emit();
  },

  /** Replace all history entries (used by restore-from-backup). */
  replaceAll(next: RecentImport[]) {
    history = [...next];
    save();
    emit();
  },

  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useImportHistory(): RecentImport[] {
  return useSyncExternalStore(
    importHistoryStore.subscribe,
    importHistoryStore.get,
    importHistoryStore.get,
  );
}
