import { accountsStore, type UserAccount } from './store';
import { transactionsStore } from '../transactions/store';
import { accounts as seedAccounts } from '../transactions/data';
import type { AccountType } from './store';

/**
 * ============================================================================
 *  ACCOUNT NORMALIZATION  —  single source of truth for opening balance
 * ============================================================================
 *
 * Opening balance is represented in exactly ONE place: `account.openingBalance`.
 * Current balance is always `account.openingBalance + net(ledger txns for that
 * account)` (see computeTotalBalance). There is no separate "opening balance"
 * ledger transaction — so a user sets the opening balance once (on the account,
 * or via an import) and every balance reconciles automatically, including after
 * the user edits it.
 *
 * This routine keeps the data in that canonical shape. It:
 *   1. Converts orphan ledger accountIds (e.g. 'hdfc' with no account record)
 *      into real accounts — reusing an existing match, never duplicating.
 *   2. Folds any legacy opening-balance LEDGER entries (isSystemGenerated) into
 *      the owning account's `openingBalance`, then removes the entry — so the
 *      opening balance is never counted twice and never lives in two places.
 *   3. Applies an optional opening-balance hint from a fresh import onto the
 *      target account (instead of writing a ledger transaction).
 *
 * Idempotent: with clean data it is a no-op. History is preserved — only
 * accountId is rewritten and redundant system entries are folded away.
 */

interface SeedMeta {
  name: string;
  mask: string;
  type: AccountType;
}

interface OpeningHint {
  accountId: string;
  amount: number;
}

function seedMetaFor(accountId: string): SeedMeta {
  const seed = seedAccounts.find((a) => a.id === accountId);
  if (seed) {
    const isCard = /credit|card/i.test(seed.label);
    return {
      name: seed.label,
      mask: seed.mask.replace(/\D/g, '').slice(-4),
      type: isCard ? 'Credit Card' : 'Savings',
    };
  }
  const name = accountId.charAt(0).toUpperCase() + accountId.slice(1);
  return { name, mask: '', type: 'Savings' };
}

function findExisting(meta: SeedMeta, list: UserAccount[]): UserAccount | undefined {
  const norm = (s: string) => s.trim().toLowerCase();
  return list.find(
    (a) => norm(a.name) === norm(meta.name) || (!!meta.mask && a.last4 === meta.mask),
  );
}

/**
 * Fold any legacy opening-balance ledger entries into their account's
 * openingBalance, then remove them. Runs for accounts that already exist (so a
 * statement previously imported as a ledger entry becomes a clean account field).
 * Returns the number of entries folded.
 */
function foldOpeningEntries(): number {
  const ledger = transactionsStore.get();
  if (!ledger) return 0;
  const openingEntries = ledger.filter((t) => t.isSystemGenerated);
  let folded = 0;
  for (const entry of openingEntries) {
    const acct = accountsStore.byId(entry.accountId);
    if (!acct) continue; // orphan — handled by the main pass below
    // Add the entry's amount onto the account's opening balance, then drop it.
    accountsStore.update(acct.id, { openingBalance: acct.openingBalance + entry.amount });
    transactionsStore.hardRemove(entry.id);
    folded += 1;
  }
  return folded;
}

/**
 * Run normalization. Pass an `openingHint` from a fresh import to set that
 * account's opening balance (single source of truth) instead of a ledger entry.
 */
export function normalizeImportedAccounts(
  openingHint?: OpeningHint,
): { created: number; relinked: number; folded: number } {
  const ledger0 = transactionsStore.get();
  if (!ledger0 || ledger0.length === 0) {
    // Even with no ledger, an import hint may target an existing account.
    if (openingHint) {
      const acct = accountsStore.byId(openingHint.accountId);
      if (acct && acct.openingBalance === 0) {
        accountsStore.update(acct.id, { openingBalance: openingHint.amount });
      }
    }
    return { created: 0, relinked: 0, folded: 0 };
  }

  const userAccounts = accountsStore.all();
  const knownIds = new Set(userAccounts.map((a) => a.id));

  const orphanIds = [...new Set(ledger0.map((t) => t.accountId))].filter(
    (id) => id && !knownIds.has(id),
  );

  let created = 0;
  let relinked = 0;

  // (1) Convert each orphan accountId into a real account, folding its opening
  //     entry into the account's openingBalance and dropping the entry.
  for (const orphanId of orphanIds) {
    const meta = seedMetaFor(orphanId);
    const txnsForId = ledger0.filter((t) => t.accountId === orphanId);
    const openingEntry = txnsForId.find((t) => t.isSystemGenerated);
    const opening = openingEntry ? openingEntry.amount : 0;

    let target = findExisting(meta, accountsStore.all());
    if (!target) {
      target = accountsStore.add({
        name: meta.name,
        bank: meta.name.split(' ')[0] || 'Bank',
        type: meta.type,
        last4: meta.mask,
        openingBalance: opening,
        currency: 'INR',
      });
      created += 1;
    } else if (openingEntry) {
      accountsStore.update(target.id, { openingBalance: target.openingBalance + opening });
    }

    if (openingEntry) transactionsStore.hardRemove(openingEntry.id);
    relinked += transactionsStore.relinkAccount(orphanId, target.id);

    // Redirect an import hint that referenced the orphan id to the real account.
    if (openingHint && openingHint.accountId === orphanId) {
      openingHint = { accountId: target.id, amount: openingHint.amount };
    }
  }

  // (2) Fold any remaining legacy opening-balance entries on KNOWN accounts.
  const folded = foldOpeningEntries();

  // (3) Apply a fresh import's opening hint onto the (now real) target account,
  //     but only if it hasn't already been set (avoid clobbering user edits).
  if (openingHint) {
    const acct = accountsStore.byId(openingHint.accountId);
    if (acct && acct.openingBalance === 0) {
      accountsStore.update(acct.id, { openingBalance: openingHint.amount });
    }
  }

  return { created, relinked, folded };
}
