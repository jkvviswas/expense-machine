import type { ParsedTransaction } from '../types';
import type { Transaction } from '../../transactions/types';

/**
 * ============================================================================
 *  DUPLICATE DETECTION ENGINE  (presentation-layer, additive)
 * ============================================================================
 *
 * When a user imports a statement, some rows may already exist in their ledger
 * (re-importing an overlapping month, or the same statement twice). This engine
 * compares freshly-parsed transactions against the existing ledger and flags
 * likely duplicates so the user can decide before committing.
 *
 * Matching is fuzzy-but-conservative, tuned to real bank data:
 *   - EXACT date + same signed amount (to the rupee) + same normalized merchant
 *     → high-confidence duplicate.
 *   - Date within ±`DATE_WINDOW_DAYS` + identical amount + same merchant
 *     → likely duplicate (banks sometimes post a day late).
 *   - Identical amount + same merchant but date far apart → NOT a duplicate
 *     (legitimately recurring, e.g. a monthly subscription).
 *
 * Touches no locked calculation. It only annotates the import set; the user's
 * choices decide what is committed.
 */

const DATE_WINDOW_DAYS = 1;

export type DuplicateReason = 'exact' | 'near';

export interface DuplicateMatch {
  /** The incoming parsed transaction flagged as a possible duplicate. */
  parsed: ParsedTransaction;
  /** The existing ledger transaction it most likely matches. */
  existing: Transaction;
  reason: DuplicateReason;
  /** 0–1 confidence that this is truly a duplicate. */
  score: number;
}

export interface DuplicateScan {
  /** IDs (of parsed txns) flagged as duplicates, with their match detail. */
  matches: Map<string, DuplicateMatch>;
  /** Convenience count. */
  count: number;
}

/** Normalize a merchant string for comparison (case/space/punctuation-insensitive). */
function normMerchant(m: string): string {
  return m.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Whole-rupee amount key so 428 and 428.00 match; sign preserved. */
function amountKey(a: number): number {
  return Math.round(a);
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00').getTime();
  const b = new Date(isoB + 'T00:00:00').getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return Math.abs(a - b) / 86_400_000;
}

/**
 * Scan parsed transactions against the existing ledger and return matches.
 * Builds an index of existing transactions keyed by amount for O(n+m) scanning
 * rather than a full cross-product.
 */
export function scanDuplicates(
  parsed: ParsedTransaction[],
  existing: Transaction[],
): DuplicateScan {
  // Index existing ledger by signed whole-rupee amount.
  const byAmount = new Map<number, Transaction[]>();
  for (const t of existing) {
    const key = amountKey(t.amount);
    const list = byAmount.get(key);
    if (list) list.push(t);
    else byAmount.set(key, [t]);
  }

  const matches = new Map<string, DuplicateMatch>();

  for (const p of parsed) {
    const candidates = byAmount.get(amountKey(p.amount));
    if (!candidates || candidates.length === 0) continue;

    const pm = normMerchant(p.merchant);
    let best: DuplicateMatch | null = null;

    for (const c of candidates) {
      if (normMerchant(c.merchant) !== pm) continue;
      const gap = daysBetween(p.date, c.date);

      if (gap === 0) {
        best = { parsed: p, existing: c, reason: 'exact', score: 0.98 };
        break; // can't do better than same-day exact
      }
      if (gap <= DATE_WINDOW_DAYS) {
        const candidate: DuplicateMatch = {
          parsed: p,
          existing: c,
          reason: 'near',
          score: 0.8,
        };
        if (!best || candidate.score > best.score) best = candidate;
      }
      // gap > window → treat as a distinct (recurring) transaction; no match.
    }

    if (best) matches.set(p.id, best);
  }

  return { matches, count: matches.size };
}
