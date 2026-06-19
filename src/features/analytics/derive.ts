import type { Transaction, Category } from '../transactions/types';
import { REFERENCE_NOW, monthKeyOf } from '../../lib/date';
import { formatIndianNumber } from '../../lib/money';

/**
 * ============================================================================
 *  ANALYTICS DERIVATION LAYER
 * ============================================================================
 * Reusable, pure functions that compute the "intelligence layer" entirely
 * from the Transactions ledger. No separate dataset. These power both the
 * Analytics module and the Reports module.
 */
export { REFERENCE_NOW };

export interface MonthKey {
  key: string; // "2026-05"
  label: string; // "May" — compact, for chart axes/chips
  labelFull: string; // "May" → full month name for premium summaries
  year: number;
  month: number; // 0-indexed
}

export function monthMeta(key: string): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return {
    key,
    label: d.toLocaleDateString('en-IN', { month: 'short' }),
    labelFull: d.toLocaleDateString('en-US', { month: 'long' }),
    year: y,
    month: m - 1,
  };
}

/** Distinct months present in the ledger, oldest first. */
export function monthsInLedger(txns: Transaction[]): MonthKey[] {
  const keys = new Set<string>();
  for (const t of txns) keys.add(monthKeyOf(t.date));
  return [...keys].sort().map(monthMeta);
}

export interface MonthlyFlow {
  month: MonthKey;
  inflow: number;
  outflow: number;
  net: number;
}

/** Inflow / outflow / net per month. */
export function monthlyFlows(txns: Transaction[]): MonthlyFlow[] {
  const map = new Map<string, { inflow: number; outflow: number }>();
  for (const t of txns) {
    if (t.isSystemGenerated) continue; // opening balance ≠ earned inflow
    const k = monthKeyOf(t.date);
    const cur = map.get(k) ?? { inflow: 0, outflow: 0 };
    if (t.amount >= 0) cur.inflow += t.amount;
    else cur.outflow += Math.abs(t.amount);
    map.set(k, cur);
  }
  return [...map.keys()]
    .sort()
    .map((k) => {
      const v = map.get(k)!;
      return { month: monthMeta(k), inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow };
    });
}

/** Total spending per month (expenses only). */
export function monthlySpending(txns: Transaction[]): { month: MonthKey; spend: number }[] {
  return monthlyFlows(txns).map((f) => ({ month: f.month, spend: f.outflow }));
}

export interface CategoryTrend {
  category: Category;
  current: number;
  previous: number;
  /** percent change vs previous month; null if no previous spend. */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
}

/** Spend per category for a given month key. */
function categorySpendForMonth(txns: Transaction[], monthKey: string): Map<Category, number> {
  const m = new Map<Category, number>();
  for (const t of txns) {
    if (monthKeyOf(t.date) !== monthKey) continue;
    if (t.amount >= 0) continue;
    m.set(t.category, (m.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return m;
}

/**
 * Category movement: current month vs previous month. Uses the two most
 * recent months present in the ledger.
 */
export function categoryTrends(txns: Transaction[]): CategoryTrend[] {
  const months = monthsInLedger(txns);
  if (months.length === 0) return [];
  const currentKey = months[months.length - 1].key;
  const prevKey = months.length > 1 ? months[months.length - 2].key : null;

  const cur = categorySpendForMonth(txns, currentKey);
  const prev = prevKey ? categorySpendForMonth(txns, prevKey) : new Map<Category, number>();

  const cats = new Set<Category>([...cur.keys(), ...prev.keys()]);
  const rows: CategoryTrend[] = [];
  for (const category of cats) {
    if (category === 'Income') continue;
    const current = cur.get(category) ?? 0;
    const previous = prev.get(category) ?? 0;
    let changePct: number | null = null;
    let direction: CategoryTrend['direction'] = 'flat';
    if (previous > 0) {
      changePct = ((current - previous) / previous) * 100;
      direction = changePct > 2 ? 'up' : changePct < -2 ? 'down' : 'flat';
    } else if (current > 0) {
      direction = 'up';
    }
    rows.push({ category, current, previous, changePct, direction });
  }
  return rows.sort((a, b) => b.current - a.current);
}

export interface MerchantInsight {
  merchant: string;
  category: Category;
  count: number;
  total: number;
}

/** Merchant insights: frequency + total spend, busiest first. */
export function merchantInsights(txns: Transaction[], n = 6): MerchantInsight[] {
  const map = new Map<string, MerchantInsight>();
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const cur = map.get(t.merchant) ?? {
      merchant: t.merchant,
      category: t.category,
      count: 0,
      total: 0,
    };
    cur.count += 1;
    cur.total += Math.abs(t.amount);
    map.set(t.merchant, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

export interface CashflowSummary {
  inflow: number;
  outflow: number;
  net: number;
}

export function cashflowSummary(txns: Transaction[], monthKey?: string): CashflowSummary {
  let inflow = 0;
  let outflow = 0;
  for (const t of txns) {
    if (t.isSystemGenerated) continue; // opening balance excluded from flow
    if (monthKey && monthKeyOf(t.date) !== monthKey) continue;
    if (t.amount >= 0) inflow += t.amount;
    else outflow += Math.abs(t.amount);
  }
  return { inflow, outflow, net: inflow - outflow };
}

export interface Insight {
  id: string;
  text: string;
  tone: 'gain' | 'loss' | 'neutral';
}

/**
 * Generate intelligent-looking insights from the ledger. Rule-based today;
 * structured so a future AI layer can append richer ones (see explanation).
 * Each insight is a plain, specific sentence grounded in derived numbers.
 */
export function generateInsights(txns: Transaction[]): Insight[] {
  const out: Insight[] = [];
  const trends = categoryTrends(txns);
  const months = monthsInLedger(txns);
  const hasPrev = months.length > 1;

  // Biggest category mover (up)
  const biggestUp = trends.find((t) => t.direction === 'up' && t.changePct != null);
  if (hasPrev && biggestUp && biggestUp.changePct != null) {
    out.push({
      id: 'mover-up',
      text: `${biggestUp.category} spending increased ${Math.round(biggestUp.changePct)}% versus last month.`,
      tone: 'loss',
    });
  }

  // Notable decrease
  const biggestDown = [...trends].reverse().find((t) => t.direction === 'down' && t.changePct != null);
  if (hasPrev && biggestDown && biggestDown.changePct != null) {
    out.push({
      id: 'mover-down',
      text: `${biggestDown.category} activity is down ${Math.abs(Math.round(biggestDown.changePct))}% — below last month.`,
      tone: 'gain',
    });
  }

  // Stable category
  const stable = trends.find((t) => t.direction === 'flat' && t.previous > 0);
  if (hasPrev && stable) {
    out.push({
      id: 'stable',
      text: `${stable.category} costs remain steady month over month.`,
      tone: 'neutral',
    });
  }

  // Top merchant
  const merchants = merchantInsights(txns, 1);
  if (merchants.length) {
    const m = merchants[0];
    out.push({
      id: 'top-merchant',
      text: `${m.merchant} is your most-used merchant — ₹${formatIndianNumber(m.total)} across ${m.count} transactions.`,
      tone: 'neutral',
    });
  }

  // Savings rate
  const cf = cashflowSummary(txns, months.length ? months[months.length - 1].key : undefined);
  if (cf.inflow > 0) {
    const rate = Math.round((cf.net / cf.inflow) * 100);
    out.push({
      id: 'savings-rate',
      text:
        rate >= 0
          ? `You saved ${rate}% of income this month.`
          : `You spent ${Math.abs(rate)}% more than you earned this month.`,
      tone: rate >= 0 ? 'gain' : 'loss',
    });
  }

  return out;
}

/* ---------------------------------------------------------------------------
 *  COMPARISON HELPERS (additive — presentation support for sparse-data views).
 *  These do not alter any existing derivation; they compose monthlyFlows().
 * ------------------------------------------------------------------------- */

export interface MonthComparison {
  current: MonthlyFlow | null;
  previous: MonthlyFlow | null;
  incomeChangePct: number | null;
  spendChangePct: number | null;
  netChangePct: number | null;
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** Compare the two most recent months (for richer sparse-data layouts). */
export function monthComparison(txns: Transaction[]): MonthComparison {
  const flows = monthlyFlows(txns);
  const current = flows.length ? flows[flows.length - 1] : null;
  const previous = flows.length > 1 ? flows[flows.length - 2] : null;
  return {
    current,
    previous,
    incomeChangePct: current && previous ? pctChange(current.inflow, previous.inflow) : null,
    spendChangePct: current && previous ? pctChange(current.outflow, previous.outflow) : null,
    netChangePct: current && previous ? pctChange(current.net, previous.net) : null,
  };
}

// ---------------------------------------------------------------------------
//  COMPARATIVE ANALYTICS — per-category MoM / QoQ / YoY  (Phase 7)
// ---------------------------------------------------------------------------

export type ComparePeriod = 'month' | 'quarter' | 'year';

export interface CategoryDelta {
  category: Category;
  current: number; // spend in current period
  previous: number; // spend in previous period
  changePct: number | null; // null when previous is 0 (no baseline)
  direction: 'up' | 'down' | 'flat';
}

export interface PeriodComparison {
  period: ComparePeriod;
  currentLabel: string;
  previousLabel: string;
  categories: CategoryDelta[];
  totalCurrent: number;
  totalPrevious: number;
  totalChangePct: number | null;
}

/** Period bucket key for a date: '2026-06' (month), '2026-Q2', or '2026'. */
function periodKeyOf(iso: string, period: ComparePeriod): string {
  const [y, m] = iso.split('-').map(Number);
  if (period === 'year') return `${y}`;
  if (period === 'quarter') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function periodLabel(key: string, period: ComparePeriod): string {
  if (period === 'year') return key;
  if (period === 'quarter') return key.replace('-', ' ');
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Compare per-category spending between the most recent period and the one
 * before it, at month / quarter / year granularity. Pure ledger derivation —
 * no stored aggregates. Returns categories sorted by current spend desc.
 */
export function categoryComparison(txns: Transaction[], period: ComparePeriod): PeriodComparison {
  const keys = [...new Set(txns.map((t) => periodKeyOf(t.date, period)))].sort();
  const curKey = keys[keys.length - 1] ?? '';
  const prevKey = keys[keys.length - 2] ?? '';

  const sumByCat = (key: string) => {
    const map = new Map<Category, number>();
    for (const t of txns) {
      if (t.amount >= 0) continue; // expenses only
      if (periodKeyOf(t.date, period) !== key) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
    }
    return map;
  };

  const cur = sumByCat(curKey);
  const prev = sumByCat(prevKey);
  const cats = new Set<Category>([...cur.keys(), ...prev.keys()]);

  const categories: CategoryDelta[] = [...cats]
    .map((category) => {
      const c = cur.get(category) ?? 0;
      const p = prev.get(category) ?? 0;
      const changePct = pctChange(c, p);
      const direction: CategoryDelta['direction'] =
        c > p ? 'up' : c < p ? 'down' : 'flat';
      return { category, current: c, previous: p, changePct, direction };
    })
    .sort((a, b) => b.current - a.current);

  const totalCurrent = [...cur.values()].reduce((s, v) => s + v, 0);
  const totalPrevious = [...prev.values()].reduce((s, v) => s + v, 0);

  return {
    period,
    currentLabel: curKey ? periodLabel(curKey, period) : '—',
    previousLabel: prevKey ? periodLabel(prevKey, period) : '—',
    categories,
    totalCurrent,
    totalPrevious,
    totalChangePct: pctChange(totalCurrent, totalPrevious),
  };
}
