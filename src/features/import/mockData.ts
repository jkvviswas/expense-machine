import type { ParsedTransaction } from './types';

/**
 * Generic, data-agnostic helpers used across the import screens.
 *
 * NOTE: The actual sample transactions, statement metadata and recent imports
 * now live behind the parsing layer (./parsing/*). The UI obtains real data
 * via `extractStatement()` rather than importing a static array. This file
 * keeps only logic that operates ON transactions, regardless of their source.
 */

/** Totals derived from any set of transactions (mock or real). */
export function computeTotals(txns: ParsedTransaction[]) {
  let inflow = 0;
  let outflow = 0;
  for (const t of txns) {
    if (t.amount >= 0) inflow += t.amount;
    else outflow += t.amount;
  }
  return {
    inflow,
    outflow,
    net: inflow + outflow,
    count: txns.length,
  };
}

/** The narrated processing steps (India-flavoured). */
export const processingSteps = [
  'Reading bank statement',
  'Extracting transactions',
  'Recognising merchants',
  'Preparing review',
] as const;

/** Recent imports are presentation data; re-exported from the sample set. */
export { recentImports } from './parsing/sampleData';
