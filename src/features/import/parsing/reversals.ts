import type { ParsedTransaction } from '../types';

/**
 * ============================================================================
 *  REFUND / REVERSAL DETECTION  (presentation-layer, additive)
 * ============================================================================
 *
 * Banks often post a charge and then reverse it: a debit of −₹150 followed a
 * few days later by a credit of +₹150 (failed payment refund, merchant
 * reversal, chargeback). Naive classification reads these as two unrelated
 * entries. This engine pairs them so the UI can label the credit as a
 * Refund/Reversal of the matching debit rather than generic income.
 *
 * Conservative matching, tuned to real statements:
 *   - opposite signs, identical absolute amount (to the rupee)
 *   - same normalized merchant OR a reversal keyword in the narration
 *   - credit dated on/after the debit, within REVERSAL_WINDOW_DAYS
 *
 * It annotates only — it never alters amounts, signs, or any locked
 * calculation. The ledger math is unchanged; this adds a label + confidence.
 */

const REVERSAL_WINDOW_DAYS = 7;
const REVERSAL_WORDS =
  /\b(refund|reversal|reversed|returned|chargeback|charge back|failed|declined|cancellation|cancelled)\b/i;

export interface ReversalMatch {
  /** The credit (positive) entry that reverses an earlier debit. */
  creditId: string;
  /** The debit (negative) entry being reversed. */
  debitId: string;
  /** 0–1 confidence this is truly a reversal pair. */
  score: number;
}

export interface ReversalScan {
  /** creditId → match detail. */
  matches: Map<string, ReversalMatch>;
  count: number;
}

function normMerchant(m: string): string {
  return m.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00').getTime();
  const b = new Date(isoB + 'T00:00:00').getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return Math.abs(a - b) / 86_400_000;
}

/**
 * Scan a parsed import set for refund/reversal pairs. For each credit, find the
 * nearest preceding debit of the same magnitude and merchant.
 */
export function detectReversals(parsed: ParsedTransaction[]): ReversalScan {
  const matches = new Map<string, ReversalMatch>();
  const debits = parsed.filter((t) => t.amount < 0);
  const used = new Set<string>();

  for (const credit of parsed) {
    if (credit.amount <= 0) continue;
    const target = Math.round(credit.amount);
    let best: { debit: ParsedTransaction; score: number } | null = null;

    for (const debit of debits) {
      if (used.has(debit.id)) continue;
      if (Math.round(Math.abs(debit.amount)) !== target) continue;
      const gap = daysBetween(credit.date, debit.date);
      if (gap > REVERSAL_WINDOW_DAYS) continue;

      const sameMerchant = normMerchant(debit.merchant) === normMerchant(credit.merchant);
      const reversalWord =
        REVERSAL_WORDS.test(credit.description) || REVERSAL_WORDS.test(credit.merchant);
      if (!sameMerchant && !reversalWord) continue;

      // Closer in time + same merchant + explicit keyword → higher confidence.
      let score = 0.7;
      if (sameMerchant) score += 0.15;
      if (reversalWord) score += 0.1;
      if (gap <= 2) score += 0.05;
      score = Math.min(0.99, score);

      if (!best || score > best.score) best = { debit, score };
    }

    if (best) {
      used.add(best.debit.id);
      matches.set(credit.id, {
        creditId: credit.id,
        debitId: best.debit.id,
        score: best.score,
      });
    }
  }

  return { matches, count: matches.size };
}
