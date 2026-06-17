/**
 * ============================================================================
 *  PERSIST  —  safe localStorage helper  (additive, presentation-layer)
 * ============================================================================
 *
 * A tiny, defensive wrapper around localStorage used by the persistence layer.
 * It NEVER touches calculation logic — it only serializes/rehydrates UI state
 * (the ledger working copy, category edits, budget caps, import history,
 * settings) so the app survives a refresh.
 *
 * All access is guarded: if storage is unavailable (private mode, SSR, quota),
 * every call degrades to a no-op and the app behaves exactly as the in-memory
 * V1 did. Reads validate JSON and fall back to a provided default.
 */

const PREFIX = 'em:'; // Expense Machine namespace
const VERSION = 'v1';

function available(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const k = `${PREFIX}__probe`;
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const ENABLED = available();

function fullKey(key: string): string {
  return `${PREFIX}${VERSION}:${key}`;
}

export const persist = {
  enabled: ENABLED,

  read<T>(key: string, fallback: T): T {
    if (!ENABLED) return fallback;
    try {
      const raw = window.localStorage.getItem(fullKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  write<T>(key: string, value: T): void {
    if (!ENABLED) return;
    try {
      window.localStorage.setItem(fullKey(key), JSON.stringify(value));
    } catch {
      // quota / serialization failure → silently skip; in-memory still works.
    }
  },

  remove(key: string): void {
    if (!ENABLED) return;
    try {
      window.localStorage.removeItem(fullKey(key));
    } catch {
      /* no-op */
    }
  },

  /** Clear only Expense Machine keys (used by Settings → Clear data). */
  clearAll(): void {
    if (!ENABLED) return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* no-op */
    }
  },
};

/** Stable storage keys, centralized to avoid typos across modules. */
export const STORAGE_KEYS = {
  transactions: 'transactions',
  importHistory: 'import-history',
  budgets: 'budgets',
  settings: 'settings',
  trash: 'trash',
  merchantRules: 'merchant-rules',
  loans: 'loans',
  accounts: 'accounts',
  commitments: 'commitments',
  categories: 'categories',
  balanceLock: 'balance-lock',
} as const;
