import type { Transaction } from '../transactions/types';
import { monthsInLedger, monthlyFlows, type MonthlyFlow } from './derive';

/**
 * ANALYTICS HISTORY (presentation-only, additive).
 *
 * The locked ledger (transactions/data.ts) holds one rich month plus a sparse
 * current month — not enough for premium trend / comparison / prediction
 * views. Rather than touch the locked data file, this module SYNTHESIZES
 * plausible prior-month history from the real ledger so the V4 timeline,
 * comparison and prediction sections have material to work with.
 *
 * Everything here is explicitly SIMULATED and labelled as such in the UI. It
 * never feeds Dashboard / Budgets / Safe-to-Spend / Reports — only Analytics.
 */

export interface HistoryMonth extends MonthlyFlow {
  simulated: boolean;
}

// Deterministic pseudo-random so the simulated history is stable across renders.
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Returns up to 6 months of flows: real months from the ledger plus simulated
 * earlier months derived by perturbing the real baseline. Oldest first.
 */
export function buildHistory(txns: Transaction[], target = 6): HistoryMonth[] {
  const realFlows = monthlyFlows(txns);
  if (realFlows.length === 0) return [];

  const real: HistoryMonth[] = realFlows.map((f) => ({ ...f, simulated: false }));

  // Use the richest real month (max outflow) as the baseline to vary from.
  const baseline = realFlows.reduce((a, b) => (b.outflow > a.outflow ? b : a));
  const rand = seeded(Math.round(baseline.outflow) + realFlows.length);

  const needed = Math.max(0, target - real.length);
  const earliest = monthsInLedger(txns)[0];
  const simulated: HistoryMonth[] = [];
  for (let i = 1; i <= needed; i++) {
    // walk backwards from the earliest real month
    const d = new Date(earliest.year, earliest.month - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const labelFull = d.toLocaleDateString('en-US', { month: 'long' });
    // vary income +/-8%, outflow +/-18% around baseline
    const incomeVar = 0.92 + rand() * 0.16;
    const outVar = 0.82 + rand() * 0.36;
    const inflow = Math.round(baseline.inflow * incomeVar);
    const outflow = Math.round(baseline.outflow * outVar);
    simulated.push({
      month: { key, label, labelFull, year: d.getFullYear(), month: d.getMonth() },
      inflow,
      outflow,
      net: inflow - outflow,
      simulated: true,
    });
  }

  // simulated are older → place before real, oldest first
  return [...simulated.reverse(), ...real];
}

/** Whether any month shown is simulated (drives the UI disclosure label). */
export function hasSimulatedHistory(history: HistoryMonth[]): boolean {
  return history.some((h) => h.simulated);
}
