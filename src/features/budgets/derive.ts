import type { Transaction, Category } from '../transactions/types';
import type { BudgetMap } from './store';

/**
 * Budget derivation. Like the dashboard layer, every figure is COMPUTED from
 * the Transactions V1 ledger against the caps in the budget store. No separate
 * budget dataset exists.
 */
export const REFERENCE_NOW = new Date();

function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso + 'T00:00:00');
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export interface CategoryBudget {
  category: Category;
  cap: number;
  spent: number;
  remaining: number;
  ratio: number; // spent / cap (unclamped, for status)
  status: 'on-track' | 'watch' | 'over';
}

/** Spend for one category in the reference month. */
export function spendByCategory(
  txns: Transaction[],
  ref: Date = REFERENCE_NOW,
): Map<Category, number> {
  const m = new Map<Category, number>();
  for (const t of txns) {
    if (!sameMonth(t.date, ref)) continue;
    if (t.amount >= 0) continue;
    m.set(t.category, (m.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return m;
}

export function statusFor(ratio: number): CategoryBudget['status'] {
  if (ratio >= 1) return 'over';
  if (ratio >= 0.8) return 'watch';
  return 'on-track';
}

/** Build per-category budget rows from caps + ledger. */
export function categoryBudgets(
  txns: Transaction[],
  caps: BudgetMap,
  ref: Date = REFERENCE_NOW,
): CategoryBudget[] {
  const spend = spendByCategory(txns, ref);
  return (Object.keys(caps) as Category[])
    .map((category) => {
      const cap = caps[category] ?? 0;
      const spent = spend.get(category) ?? 0;
      const ratio = cap > 0 ? spent / cap : 0;
      return {
        category,
        cap,
        spent,
        remaining: cap - spent,
        ratio,
        status: statusFor(ratio),
      };
    })
    .sort((a, b) => b.ratio - a.ratio); // most-pressured first
}

export interface BudgetOverview {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  /** 0–100 discipline score. */
  healthScore: number;
  overCount: number;
  watchCount: number;
}

/**
 * Overview totals + a discipline "health score".
 * Score rewards staying under caps: it is the share of total budget NOT
 * overspent, lightly penalised for each category in breach. Calm, legible,
 * and derived — not a black-box number.
 */
export function budgetOverview(rows: CategoryBudget[]): BudgetOverview {
  const totalBudget = rows.reduce((s, r) => s + r.cap, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const overCount = rows.filter((r) => r.status === 'over').length;
  const watchCount = rows.filter((r) => r.status === 'watch').length;

  const usedRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
  // base: how much headroom remains (100 = nothing spent, 0 = fully spent)
  const base = Math.max(0, 1 - usedRatio) * 100;
  // penalty: 6 points per over-budget category, 2 per watch
  const penalty = overCount * 6 + watchCount * 2;
  const healthScore = Math.max(0, Math.min(100, Math.round(base - penalty + 20)));

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    healthScore,
    overCount,
    watchCount,
  };
}

/** Transactions for one category in the reference month, newest first. */
export function categoryTransactions(
  txns: Transaction[],
  category: Category,
  ref: Date = REFERENCE_NOW,
): Transaction[] {
  return txns
    .filter((t) => t.category === category && t.amount < 0 && sameMonth(t.date, ref))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** A plain-language suggestion for a category's budget performance. */
export function suggestionFor(b: CategoryBudget): string {
  if (b.cap === 0) return 'No budget set yet. Add a monthly limit to start tracking this category.';
  if (b.status === 'over') {
    const over = b.spent - b.cap;
    return `You're ₹${over.toLocaleString('en-IN')} over this month. Consider raising the limit or trimming spend here.`;
  }
  if (b.status === 'watch') {
    return `You've used ${Math.round(b.ratio * 100)}% of this budget. Pace carefully through the rest of the month.`;
  }
  return `Comfortably on track — ₹${b.remaining.toLocaleString('en-IN')} still available this month.`;
}
