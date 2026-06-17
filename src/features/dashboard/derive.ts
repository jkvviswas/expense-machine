import type { Transaction, Category } from '../transactions/types';
import { txnType } from '../transactions/types';
import { budgetStore } from '../budgets/store';
import type { Commitment } from '../commitments/store';

/**
 * ============================================================================
 *  DASHBOARD DERIVATION LAYER
 * ============================================================================
 * Every value on the dashboard is COMPUTED from the existing Transactions V1
 * ledger. There is no separate dashboard dataset. These are pure functions so
 * they are testable and so the dashboard stays a thin presenter.
 *
 * Reference "now" matches the ledger's sample window (early June 2026) so the
 * mock data produces a meaningful current-month view.
 */
export const REFERENCE_NOW = new Date();

function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso + 'T00:00:00');
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

/** Income / spending for the reference month. */
export function monthlyFigures(txns: Transaction[], ref: Date = REFERENCE_NOW) {
  let income = 0;
  let spending = 0;
  for (const t of txns) {
    if (!sameMonth(t.date, ref)) continue;
    if (t.amount >= 0) income += t.amount;
    else spending += Math.abs(t.amount);
  }
  return { income, spending };
}

export interface Obligation {
  id: string;
  label: string;
  category: Category;
  amount: number; // positive = the rupee outflow expected
  cadence: 'Monthly' | 'Auto-pay' | 'SIP';
  dueLabel: string; // e.g. "Due 5 Jun"
}

/**
 * Upcoming committed obligations, sourced directly from `commitmentsStore`
 * (user-created commitments + auto loan-EMI virtual commitments) — the same
 * single source of truth as the Commitments page. Previously this was a
 * heuristic that re-detected "recurring" transactions from the ledger, which
 * could surface items (e.g. a one-off Airtel recharge matching `/recharge/`)
 * that did not exist in — and could not be managed from — the Commitments
 * page. That detector has been removed.
 */
export function obligationsFromCommitments(commitments: Commitment[]): Obligation[] {
  return commitments
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      label: c.name,
      category: c.category,
      amount: c.amount,
      cadence: c.kind === 'SIP' ? 'SIP' : c.kind === 'EMI' || c.kind === 'Credit Card' ? 'Auto-pay' : 'Monthly',
      dueLabel: nextDueLabel(c.dueDate),
    }));
}

/** Format an ISO due date as "Due D Mon" using its own month. */
function nextDueLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  return `Due ${day} ${month}`;
}

export function totalObligations(obs: Obligation[]): number {
  return obs.reduce((s, o) => s + o.amount, 0);
}

/**
 * SAFE TO SPEND
 * = money on hand this month  −  what is already promised  −  a small buffer
 *
 * "Money on hand" is approximated for V1 as (monthly income − spend so far),
 * i.e. what remains of this month's inflow. From that we subtract upcoming
 * obligations (rent, SIPs, auto-pay) that haven't yet cleared, and a 10%
 * safety buffer of income so the figure never encourages spending to zero.
 */
export function safeToSpend(txns: Transaction[], commitments: Commitment[], ref: Date = REFERENCE_NOW) {
  const { income, spending } = monthlyFigures(txns, ref);
  const obligations = obligationsFromCommitments(commitments);
  const committed = totalObligations(obligations);
  const buffer = Math.round(income * 0.1);

  const remaining = income - spending; // remaining of this month's inflow
  const safe = Math.max(0, remaining - committed - buffer);

  return {
    safe,
    income,
    spending,
    remaining,
    committed,
    buffer,
    obligations,
  };
}

/** Budget health: spent vs. a soft monthly cap per spending category. */
export interface BudgetRow {
  category: Category;
  spent: number;
  cap: number;
  ratio: number; // spent / cap, clamped 0..1.5
}

export function budgetHealth(txns: Transaction[], ref: Date = REFERENCE_NOW): BudgetRow[] {
  const caps = budgetStore.getCaps();
  const spent = new Map<Category, number>();
  for (const t of txns) {
    if (!sameMonth(t.date, ref)) continue;
    if (t.amount >= 0) continue;
    spent.set(t.category, (spent.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return (Object.keys(caps) as Category[]).map((category) => {
    const cap = caps[category] ?? 0;
    const s = spent.get(category) ?? 0;
    return {
      category,
      spent: s,
      cap,
      ratio: cap > 0 ? Math.min(s / cap, 1.5) : 0,
    };
  });
}

/** 30-day net cashflow series (one point per day with activity). */
export interface CashPoint {
  date: string;
  net: number; // cumulative net over the window
}

export function cashflowSeries(
  txns: Transaction[],
  days = 30,
  ref: Date = REFERENCE_NOW,
): CashPoint[] {
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - days);

  // group by day
  const byDay = new Map<string, number>();
  for (const t of txns) {
    const d = new Date(t.date + 'T00:00:00');
    if (d < cutoff || d > ref) continue;
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
  }

  const sortedDays = [...byDay.keys()].sort();
  let cumulative = 0;
  return sortedDays.map((date) => {
    cumulative += byDay.get(date) ?? 0;
    return { date, net: cumulative };
  });
}

/** Most recent N transactions, newest first. */
export function recentActivity(txns: Transaction[], n = 6): Transaction[] {
  return [...txns]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, n);
}

export { txnType };
