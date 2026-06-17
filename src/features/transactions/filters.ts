import type { FilterState, Transaction } from './types';
import { txnType } from './types';
import { accountById } from './data';

/** True if `iso` (yyyy-mm-dd) falls within the named window relative to `now`. */
function withinWindow(iso: string, f: FilterState, now: Date): boolean {
  const window = f.dateWindow;
  if (window === 'all') return true;
  const d = new Date(iso + 'T00:00:00');
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = startOfDay(now);

  switch (window) {
    case 'today':
      return startOfDay(d).getTime() === today.getTime();
    case '7d': {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 6); // last 7 days incl. today
      return startOfDay(d) >= cutoff && startOfDay(d) <= today;
    }
    case '30d': {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 29);
      return startOfDay(d) >= cutoff && startOfDay(d) <= today;
    }
    case 'thisMonth':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    case 'lastMonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    case 'thisYear':
      return d.getFullYear() === now.getFullYear();
    case 'custom': {
      if (f.customFrom && iso < f.customFrom) return false;
      if (f.customTo && iso > f.customTo) return false;
      return true;
    }
    default:
      return true;
  }
}

/** Apply all active filters + search. Pure; UI-agnostic. */
export function applyFilters(
  txns: Transaction[],
  f: FilterState,
  now: Date | undefined = new Date(),
): Transaction[] {
  const ref = now ?? new Date();
  const q = f.query.trim().toLowerCase();
  return txns.filter((t) => {
    if (f.category !== 'all' && t.category !== f.category) return false;
    if (f.accountId !== 'all' && t.accountId !== f.accountId) return false;
    if (f.type !== 'all' && txnType(t) !== f.type) return false;
    if (!withinWindow(t.date, f, ref)) return false;
    if (q) {
      const hay = `${t.merchant} ${t.description} ${t.notes ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Sort transactions for display. The input array's existing order is treated
 * as "statement order" (imports are committed in statement sequence, newest
 * import first) — Array#sort is stable, so for equal sort keys the original
 * relative order is preserved, satisfying "Date DESC, then statement order".
 */
export function sortTransactions(txns: Transaction[], sort: FilterState['sort']): Transaction[] {
  const out = [...txns];
  switch (sort) {
    case 'newest':
      return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    case 'oldest':
      return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    case 'amountDesc':
      return out.sort((a, b) => b.amount - a.amount);
    case 'amountAsc':
      return out.sort((a, b) => a.amount - b.amount);
    default:
      return out;
  }
}

export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.category !== 'all') n++;
  if (f.accountId !== 'all') n++;
  if (f.type !== 'all') n++;
  if (f.dateWindow !== 'all') n++;
  return n;
}

/** Totals for a set of transactions. */
export function totals(txns: Transaction[]) {
  let inflow = 0;
  let outflow = 0;
  for (const t of txns) {
    if (t.amount >= 0) inflow += t.amount;
    else outflow += t.amount;
  }
  return { inflow, outflow, net: inflow + outflow, count: txns.length };
}

/** Build a CSV string for the given transactions (export selection / all). */
export function toCSV(txns: Transaction[]): string {
  const header = ['Date', 'Merchant', 'Description', 'Category', 'Account', 'Payment Method', 'Amount (INR)'];
  const rows = txns.map((t) => {
    const acct = accountById(t.accountId);
    return [
      t.date,
      t.merchant,
      t.description.replace(/"/g, '""'),
      t.category,
      acct ? `${acct.label} ${acct.mask}` : t.accountId,
      t.paymentMethod,
      t.amount.toFixed(2),
    ]
      .map((cell) => (/[",\n]/.test(String(cell)) ? `"${cell}"` : String(cell)))
      .join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
