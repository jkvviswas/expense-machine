import type { Category, ParsedTransaction } from '../types';
import { CATEGORIES } from '../types';

/**
 * ============================================================================
 *  EXTRACTION SUMMARY  (presentation-layer, additive)
 * ============================================================================
 *
 * Derives an honest, data-driven summary of a parsed statement straight from
 * the transactions a real parser returned — no hard-coded headline numbers.
 * Used by the Extraction and Review screens so the count, category mix,
 * merchant concentration, overall confidence and the "needs review" set all
 * reflect the actual file.
 *
 * Pure functions only. No locked calculations are touched.
 */

export interface CategoryBreakdownItem {
  category: Category;
  count: number;
  total: number; // signed sum for the category
  share: number; // 0–1 of total spend (outflow) for ranking bars
}

export interface MerchantSummaryItem {
  merchant: string;
  count: number;
  total: number; // signed sum
}

export interface ExtractionSummary {
  count: number;
  inflow: number;
  outflow: number; // negative
  net: number;
  categoriesUsed: number;
  categoryBreakdown: CategoryBreakdownItem[];
  topMerchants: MerchantSummaryItem[];
  /** Average category confidence across un-edited rows, 0–1. */
  confidence: number;
  /** Transactions below the review threshold (low confidence / Uncategorized). */
  needsReview: ParsedTransaction[];
  dateRangeStart: string;
  dateRangeEnd: string;
}

const REVIEW_THRESHOLD = 0.7;

export function summarizeExtraction(
  txns: ParsedTransaction[],
): ExtractionSummary {
  let inflow = 0;
  let outflow = 0;
  const catCount = new Map<Category, number>();
  const catTotal = new Map<Category, number>();
  const merchCount = new Map<string, number>();
  const merchTotal = new Map<string, number>();
  let confidenceSum = 0;
  let confidenceN = 0;

  for (const t of txns) {
    if (t.amount >= 0) inflow += t.amount;
    else outflow += t.amount;

    catCount.set(t.category, (catCount.get(t.category) ?? 0) + 1);
    catTotal.set(t.category, (catTotal.get(t.category) ?? 0) + t.amount);
    merchCount.set(t.merchant, (merchCount.get(t.merchant) ?? 0) + 1);
    merchTotal.set(t.merchant, (merchTotal.get(t.merchant) ?? 0) + t.amount);

    if (!t.edited) {
      confidenceSum += t.confidence;
      confidenceN += 1;
    }
  }

  const totalOutflowAbs = Math.abs(outflow) || 1;

  // Category breakdown, ranked by absolute spend then count.
  const orderedCats = [...CATEGORIES, 'Uncategorized' as Category].filter((c) =>
    catCount.has(c),
  );
  const categoryBreakdown: CategoryBreakdownItem[] = orderedCats
    .map((category) => {
      const total = catTotal.get(category) ?? 0;
      return {
        category,
        count: catCount.get(category) ?? 0,
        total,
        share: Math.abs(Math.min(total, 0)) / totalOutflowAbs,
      };
    })
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  // Top merchants by absolute spend.
  const topMerchants: MerchantSummaryItem[] = [...merchTotal.entries()]
    .map(([merchant, total]) => ({
      merchant,
      total,
      count: merchCount.get(merchant) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 5);

  const needsReview = txns.filter(
    (t) => !t.edited && (t.confidence < REVIEW_THRESHOLD || t.category === 'Uncategorized'),
  );

  const dates = txns.map((t) => t.date).filter(Boolean).sort();

  return {
    count: txns.length,
    inflow,
    outflow,
    net: inflow + outflow,
    categoriesUsed: catCount.size,
    categoryBreakdown,
    topMerchants,
    confidence: confidenceN > 0 ? confidenceSum / confidenceN : 1,
    needsReview,
    dateRangeStart: dates[0] ?? '',
    dateRangeEnd: dates[dates.length - 1] ?? '',
  };
}
