import type { Transaction } from '../transactions/types';

/**
 * Dashboard period switcher (Phase 8). Filters the ledger to a chosen window so
 * KPIs/cashflow recompute for that period. Pure date filtering over the single
 * ledger — no separate store, no duplicated calculation.
 */

export type DashboardPeriod =
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'ytd'
  | 'lastYear'
  | 'all';

export const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'lastQuarter', label: 'Last quarter' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

export interface PeriodRange {
  start: string; // inclusive ISO yyyy-mm-dd
  end: string; // inclusive ISO yyyy-mm-dd
  label: string;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve a period to a concrete date range. `anchor` is the reference "today"
 * — we use the ledger's most recent transaction date so the dashboard stays
 * meaningful for historical/imported data rather than the real wall-clock date.
 */
export function resolvePeriod(period: DashboardPeriod, anchorIso: string): PeriodRange {
  const anchor = new Date(anchorIso + 'T00:00:00');
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const q = Math.floor(m / 3);
  const fmt = (label: string, s: Date, e: Date): PeriodRange => ({ start: iso(s), end: iso(e), label });

  switch (period) {
    case 'thisMonth':
      return fmt('This month', new Date(y, m, 1), new Date(y, m + 1, 0));
    case 'lastMonth':
      return fmt('Last month', new Date(y, m - 1, 1), new Date(y, m, 0));
    case 'thisQuarter':
      return fmt('This quarter', new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0));
    case 'lastQuarter': {
      const lq = q === 0 ? 3 : q - 1;
      const ly = q === 0 ? y - 1 : y;
      return fmt('Last quarter', new Date(ly, lq * 3, 1), new Date(ly, lq * 3 + 3, 0));
    }
    case 'ytd':
      return fmt('Year to date', new Date(y, 0, 1), anchor);
    case 'lastYear':
      return fmt('Last year', new Date(y - 1, 0, 1), new Date(y - 1, 11, 31));
    case 'all':
    default:
      return fmt('All time', new Date(1970, 0, 1), anchor);
  }
}

export function filterByPeriod(txns: Transaction[], range: PeriodRange): Transaction[] {
  return txns.filter((t) => t.date >= range.start && t.date <= range.end);
}
