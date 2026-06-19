import type { Transaction } from '../transactions/types';
import type { Category } from '../import/types';
import { monthlyFlows } from './derive';
import { categoryBudgets } from '../budgets/derive';
import { budgetStore } from '../budgets/store';
import { monthKeyOf } from '../../lib/date';

/**
 * ============================================================================
 *  FORECAST ENGINE  (Phase 15 — rule-based, presentation-layer, additive)
 * ============================================================================
 *
 * Genuine, explainable forecasting from the user's real ledger — no AI, no
 * black box. Method is ordinary least-squares linear regression over monthly
 * series, plus a within-month pace projection for the current month. Budget
 * overrun prediction reuses the LOCKED categoryBudgets derivation (read-only),
 * so predictions reconcile exactly with the Budgets page.
 *
 * Everything here is deterministic and inspectable; each forecast carries the
 * basis it was computed from so the UI can explain "why".
 */

// --- least squares ----------------------------------------------------------
interface Line {
  slope: number;
  intercept: number;
  r2: number;
}

function linearRegression(ys: number[]): Line {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  // r²
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * xs[i] + intercept;
    ssTot += (ys[i] - meanY) ** 2;
    ssRes += (ys[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function predictNext(line: Line, n: number): number {
  return line.slope * n + line.intercept;
}

// --- forecasts ---------------------------------------------------------------
export type Confidence = 'high' | 'medium' | 'low';

export interface SeriesForecast {
  /** Months of history used. */
  history: number;
  /** Next-month point forecast (clamped at 0). */
  nextMonth: number;
  /** Direction of the underlying trend. */
  direction: 'rising' | 'falling' | 'steady';
  /** Monthly change implied by the slope. */
  monthlyDelta: number;
  /** Confidence from fit quality + sample size. */
  confidence: Confidence;
}

function confidenceFrom(r2: number, history: number): Confidence {
  if (history < 3) return 'low';
  if (r2 >= 0.6 && history >= 4) return 'high';
  if (r2 >= 0.3) return 'medium';
  return 'low';
}

function forecastSeries(ys: number[]): SeriesForecast {
  const line = linearRegression(ys);
  const next = Math.max(0, predictNext(line, ys.length));
  const direction = line.slope > ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length) * 0.03
    ? 'rising'
    : line.slope < -(ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length)) * 0.03
      ? 'falling'
      : 'steady';
  return {
    history: ys.length,
    nextMonth: Math.round(next),
    direction,
    monthlyDelta: Math.round(line.slope),
    confidence: confidenceFrom(line.r2, ys.length),
  };
}

export interface SpendingForecast {
  spending: SeriesForecast;
  income: SeriesForecast;
  net: SeriesForecast;
  /** Projected savings by year end (sum of net forecasts to December). */
  yearEndSavings: { value: number; monthsRemaining: number; confidence: Confidence } | null;
}

export function spendingForecast(txns: Transaction[]): SpendingForecast | null {
  const flows = monthlyFlows(txns);
  if (flows.length === 0) return null;

  const spending = forecastSeries(flows.map((f) => f.outflow));
  const income = forecastSeries(flows.map((f) => f.inflow));
  const net = forecastSeries(flows.map((f) => f.net));

  // Year-end savings: current realised net + projected net for remaining months.
  let yearEndSavings: SpendingForecast['yearEndSavings'] = null;
  const lastKey = flows[flows.length - 1].month.key; // yyyy-mm
  const lastMonth = parseInt(lastKey.slice(5, 7), 10);
  const monthsRemaining = 12 - lastMonth;
  const realisedThisYear = flows
    .filter((f) => f.month.key.startsWith(lastKey.slice(0, 4)))
    .reduce((s, f) => s + f.net, 0);
  const netLine = linearRegression(flows.map((f) => f.net));
  let projected = realisedThisYear;
  for (let i = 1; i <= monthsRemaining; i++) {
    projected += predictNext(netLine, flows.length - 1 + i);
  }
  yearEndSavings = {
    value: Math.round(projected),
    monthsRemaining,
    confidence: confidenceFrom(netLine.r2, flows.length),
  };

  return { spending, income, net, yearEndSavings };
}

// --- budget overrun prediction ----------------------------------------------
export interface OverrunPrediction {
  category: Category;
  cap: number;
  spentSoFar: number;
  /** Projected month-end spend at current daily pace. */
  projected: number;
  /** Projected overshoot beyond cap (>0 means predicted overrun). */
  projectedOver: number;
  /** Fraction of the month elapsed when computed. */
  monthProgress: number;
}

/**
 * Predict which category budgets are on track to be exceeded, by extrapolating
 * the current month's spend at the elapsed pace. Reuses the LOCKED budgets
 * derivation for caps and spent-so-far.
 */
export function predictOverruns(txns: Transaction[]): OverrunPrediction[] {
  const budgets = categoryBudgets(txns, budgetStore.getCaps());
  if (budgets.length === 0) return [];

  // Determine the latest month present and how far through it we are.
  const months = [...new Set(txns.map((t) => monthKeyOf(t.date)))].sort();
  const latest = months[months.length - 1];
  if (!latest) return [];
  const year = parseInt(latest.slice(0, 4), 10);
  const month = parseInt(latest.slice(5, 7), 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Day of month of the latest transaction as a proxy for "today" in-sample.
  const latestDay = txns
    .filter((t) => monthKeyOf(t.date) === latest)
    .reduce((mx, t) => Math.max(mx, parseInt(t.date.slice(8, 10), 10)), 1);
  const progress = Math.min(1, Math.max(0.1, latestDay / daysInMonth));

  const out: OverrunPrediction[] = [];
  for (const b of budgets) {
    const projected = Math.round(b.spent / progress);
    const projectedOver = projected - b.cap;
    if (projectedOver > 0) {
      out.push({
        category: b.category,
        cap: b.cap,
        spentSoFar: b.spent,
        projected,
        projectedOver,
        monthProgress: progress,
      });
    }
  }
  return out.sort((a, b) => b.projectedOver - a.projectedOver);
}
