import type { Transaction, Category } from '../transactions/types';
import { safeToSpend } from '../dashboard/derive';
import { commitmentsStore } from '../commitments/store';
import { budgetStore } from '../budgets/store';
import { categoryBudgets, budgetOverview } from '../budgets/derive';
import {
  monthsInLedger,
  cashflowSummary,
  merchantInsights,
  generateInsights,
  monthMeta,
  type Insight,
} from '../analytics/derive';
import { monthKeyOf } from '../../lib/date';

/**
 * ============================================================================
 *  REPORT DERIVATION LAYER
 * ============================================================================
 * Composes the existing derivation layers (dashboard safeToSpend, budgets,
 * analytics) into a single monthly report model. Nothing new is invented —
 * Reports is a *view* over derived data, which is why its numbers always agree
 * with the rest of the product.
 */

export interface CategoryLine {
  category: Category;
  amount: number;
  share: number; // 0..1 of total spend
}

export interface MonthlyReport {
  monthLabel: string;
  monthKey: string;
  income: number;
  spending: number;
  netSavings: number;
  savingsRate: number; // 0..1
  safe: number;
  budgetScore: number;
  categories: CategoryLine[];
  topCategories: CategoryLine[];
  largestExpenses: Transaction[];
  insights: Insight[];
}

/** Build the full monthly report for the most recent (or given) month. */
export function buildMonthlyReport(txns: Transaction[], monthKey?: string): MonthlyReport {
  const months = monthsInLedger(txns);
  const key = monthKey ?? (months.length ? months[months.length - 1].key : '2026-06');
  const meta = monthMeta(key);

  const inMonth = txns.filter((t) => monthKeyOf(t.date) === key);
  const cf = cashflowSummary(txns, key);

  // category breakdown (expenses)
  const catMap = new Map<Category, number>();
  for (const t of inMonth) {
    if (t.amount >= 0) continue;
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  const totalSpend = [...catMap.values()].reduce((s, v) => s + v, 0) || 1;
  const categories: CategoryLine[] = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount, share: amount / totalSpend }))
    .sort((a, b) => b.amount - a.amount);

  const largestExpenses = [...inMonth]
    .filter((t) => t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  const sts = safeToSpend(txns, commitmentsStore.all());
  const budgetRows = categoryBudgets(txns, budgetStore.getCaps());
  const overview = budgetOverview(budgetRows);

  const netSavings = cf.inflow - cf.outflow;
  const savingsRate = cf.inflow > 0 ? netSavings / cf.inflow : 0;

  return {
    monthLabel: `${meta.labelFull} ${meta.year}`,
    monthKey: key,
    income: cf.inflow,
    spending: cf.outflow,
    netSavings,
    savingsRate,
    safe: sts.safe,
    budgetScore: overview.healthScore,
    categories,
    topCategories: categories.slice(0, 5),
    largestExpenses,
    insights: generateInsights(txns),
  };
}

/** Re-export merchant insights for the report summary. */
export { merchantInsights };

/* Export layer lives in ./export (presentation only; no report math). */
export { exporters, xlsxExporter, pdfExporter } from './export';
export type { ReportExporter } from './export';
