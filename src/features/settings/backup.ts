import type { Settings } from './store';
import { settingsStore } from './store';
import { budgetStore, type BudgetMap } from '../budgets/store';
import { transactionsStore } from '../transactions/store';
import { importHistoryStore } from '../import/parsing/importHistory';
import type { Transaction } from '../transactions/types';
import type { RecentImport } from '../import/types';
import { CATEGORIES } from '../import/types';

/**
 * ============================================================================
 *  BACKUP / RESTORE  (presentation-layer, additive)
 * ============================================================================
 *
 * Serializes the full working workspace to a portable JSON document and
 * restores it with validation + clear errors. Because everything is now backed
 * by persisted stores (Sessions 4–5), a restore simply replays validated state
 * through each store's PUBLIC API — no locked file is touched, and the persisted
 * snapshots update through the normal store paths.
 */

const BACKUP_VERSION = 1;
const VALID_CATEGORIES = new Set<string>([...CATEGORIES, 'Uncategorized']);

export interface WorkspaceBackup {
  app: 'expense-machine';
  version: number;
  exportedAt: string;
  settings: Settings;
  budgets: BudgetMap;
  transactions: Transaction[];
  importHistory: RecentImport[];
}

/** Build a complete, portable backup of the current workspace. */
export function buildBackup(): WorkspaceBackup {
  return {
    app: 'expense-machine',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settingsStore.get(),
    budgets: budgetStore.getCaps(),
    transactions: transactionsStore.get(),
    importHistory: importHistoryStore.get(),
  };
}

export class BackupError extends Error {}

/** Type guards / validators kept small and explicit for good error messages. */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateTransactions(raw: unknown): Transaction[] {
  if (!Array.isArray(raw)) throw new BackupError('Backup is missing a valid transactions list.');
  const out: Transaction[] = [];
  raw.forEach((t, i) => {
    if (!isObject(t)) throw new BackupError(`Transaction #${i + 1} is malformed.`);
    const { id, date, merchant, amount, category, accountId } = t as Record<string, unknown>;
    if (typeof id !== 'string') throw new BackupError(`Transaction #${i + 1} has no id.`);
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new BackupError(`Transaction #${i + 1} has an invalid date.`);
    if (typeof amount !== 'number' || Number.isNaN(amount))
      throw new BackupError(`Transaction #${i + 1} has an invalid amount.`);
    if (typeof category !== 'string' || !VALID_CATEGORIES.has(category))
      throw new BackupError(`Transaction #${i + 1} has an unknown category "${String(category)}".`);
    out.push({
      id,
      date,
      merchant: typeof merchant === 'string' ? merchant : 'Unknown',
      description: typeof (t as Record<string, unknown>).description === 'string'
        ? ((t as Record<string, unknown>).description as string)
        : '',
      amount,
      category: category as Transaction['category'],
      accountId: typeof accountId === 'string' ? accountId : 'acc-1',
      paymentMethod:
        (typeof (t as Record<string, unknown>).paymentMethod === 'string'
          ? ((t as Record<string, unknown>).paymentMethod as Transaction['paymentMethod'])
          : 'UPI'),
      notes: typeof (t as Record<string, unknown>).notes === 'string'
        ? ((t as Record<string, unknown>).notes as string)
        : undefined,
      confidence: typeof (t as Record<string, unknown>).confidence === 'number'
        ? ((t as Record<string, unknown>).confidence as number)
        : undefined,
      edited: (t as Record<string, unknown>).edited === true,
    });
  });
  return out;
}

function validateBudgets(raw: unknown): BudgetMap {
  if (!isObject(raw)) throw new BackupError('Backup is missing a valid budgets map.');
  const out: BudgetMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!VALID_CATEGORIES.has(k)) continue; // ignore unknown keys gracefully
    if (typeof v === 'number' && v >= 0) out[k as keyof BudgetMap] = Math.round(v);
  }
  return out;
}

/**
 * Parse + validate a raw JSON string into a WorkspaceBackup. Throws BackupError
 * with a human-readable message on any problem.
 */
export function parseBackup(json: string): WorkspaceBackup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BackupError('That file isn’t valid JSON.');
  }
  if (!isObject(data)) throw new BackupError('That backup file is not in the expected format.');

  if (data.app !== 'expense-machine') {
    throw new BackupError('This doesn’t look like an Expense Machine backup.');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version and can’t be restored here.');
  }
  if (!isObject(data.settings)) {
    throw new BackupError('Backup is missing its settings section.');
  }

  const transactions = validateTransactions(data.transactions);
  const budgets = validateBudgets(data.budgets);
  const importHistory = Array.isArray(data.importHistory)
    ? (data.importHistory as RecentImport[])
    : [];

  return {
    app: 'expense-machine',
    version: data.version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    settings: data.settings as unknown as Settings,
    budgets,
    transactions,
    importHistory,
  };
}

export interface RestoreSummary {
  transactions: number;
  budgets: number;
  importHistory: number;
}

/** Apply a validated backup to every store via public APIs. */
export function restoreBackup(backup: WorkspaceBackup): RestoreSummary {
  // Settings: replay each known key.
  const current = settingsStore.get();
  (Object.keys(current) as (keyof Settings)[]).forEach((k) => {
    const incoming = (backup.settings as Settings)[k];
    if (incoming !== undefined) settingsStore.set(k, incoming);
  });

  // Budgets: clear current caps, then set restored ones.
  const currentCaps = budgetStore.getCaps();
  (Object.keys(currentCaps) as (keyof BudgetMap)[]).forEach((cat) =>
    budgetStore.removeCap(cat),
  );
  (Object.keys(backup.budgets) as (keyof BudgetMap)[]).forEach((cat) => {
    const amount = backup.budgets[cat];
    if (typeof amount === 'number') budgetStore.setCap(cat, amount);
  });

  // Transactions + history: replace wholesale.
  transactionsStore.replaceAll(backup.transactions);
  importHistoryStore.replaceAll(backup.importHistory);

  return {
    transactions: backup.transactions.length,
    budgets: Object.keys(backup.budgets).length,
    importHistory: backup.importHistory.length,
  };
}
