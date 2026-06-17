import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';
import { transactionsStore } from '../transactions/store';

export type AccountType = 'Savings' | 'Salary' | 'Current' | 'Credit Card' | 'Joint' | 'Wallet' | 'Other';

export interface UserAccount {
  id: string;
  name: string;
  bank: string;
  type: AccountType;
  last4: string;
  openingBalance: number;
  currency: string;
  notes?: string;
  archived?: boolean;
}

export const ACCOUNT_TYPES: AccountType[] = ['Savings', 'Salary', 'Current', 'Credit Card', 'Joint', 'Wallet', 'Other'];

// Fresh install: NO accounts. Accounts come only from user creation or import.
let accounts: UserAccount[] = persist.read<UserAccount[]>(STORAGE_KEYS.accounts, []) ?? [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => persist.write(STORAGE_KEYS.accounts, accounts);

export const accountsStore = {
  all(): UserAccount[] {
    return accounts;
  },
  active(): UserAccount[] {
    return accounts.filter((a) => !a.archived);
  },
  byId(id: string): UserAccount | undefined {
    return accounts.find((a) => a.id === id);
  },
  add(acc: Omit<UserAccount, 'id'>): UserAccount {
    const created: UserAccount = { ...acc, id: `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
    accounts = [created, ...accounts];
    save();
    emit();
    return created;
  },
  update(id: string, patch: Partial<Omit<UserAccount, 'id'>>) {
    accounts = accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
    save();
    emit();
  },
  /**
   * Change an account's id and re-link all its ledger transactions to the new
   * id, so the account ↔ transaction relationship is preserved. Returns the
   * number of transactions moved. No-op if the new id is empty, unchanged, or
   * already taken by another account.
   */
  changeId(oldId: string, newId: string): number {
    const next = newId.trim();
    if (!next || next === oldId) return 0;
    if (accounts.some((a) => a.id === next)) return 0; // collision → reject
    accounts = accounts.map((a) => (a.id === oldId ? { ...a, id: next } : a));
    save();
    emit();
    // Re-link transactions (import lazily to avoid a circular module load).
    return transactionsStore.relinkAccount(oldId, next);
  },
  remove(id: string) {
    accounts = accounts.filter((a) => a.id !== id);
    save();
    emit();
  },
  archive(id: string, archived = true) {
    this.update(id, { archived });
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAccounts(): UserAccount[] {
  return useSyncExternalStore(accountsStore.subscribe, accountsStore.all, () => accounts);
}

/**
 * Single source of truth for "current balance". Sums:
 *   1. Each active user account's opening balance, plus the net of all ledger
 *      transactions assigned to it, and
 *   2. The net of any ledger transactions whose accountId does NOT match a user
 *      account (e.g. imported statements / opening-balance entries committed
 *      before the user created a matching account). Without this, that activity
 *      would be silently dropped and the balance would read ₹0.
 *
 * Statement opening-balance system entries already live in the ledger, so they
 * are counted exactly once. Archived user accounts are excluded from their
 * opening-balance contribution, but their historical ledger activity still
 * counts via the orphan path only if the account is fully removed — archived
 * accounts keep their id, so their txns are matched and (intentionally) skipped.
 */
export function computeTotalBalance(
  ledger: { accountId: string; amount: number }[],
  accountList: UserAccount[],
): number {
  const net = new Map<string, number>();
  for (const t of ledger) net.set(t.accountId, (net.get(t.accountId) ?? 0) + t.amount);

  const activeIds = new Set(accountList.filter((a) => !a.archived).map((a) => a.id));
  const knownIds = new Set(accountList.map((a) => a.id));

  // (1) Active user accounts: opening balance + their ledger net.
  let total = accountList
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + a.openingBalance + (net.get(a.id) ?? 0), 0);

  // (2) Orphan ledger activity: transactions on accountIds with no user account
  // at all. These represent real money (imported statements, seed data) and must
  // be included. Activity on archived accounts (known but not active) is excluded.
  for (const [accountId, amount] of net) {
    if (!knownIds.has(accountId)) total += amount;
    else if (!activeIds.has(accountId)) continue; // archived → skip
  }

  return total;
}
