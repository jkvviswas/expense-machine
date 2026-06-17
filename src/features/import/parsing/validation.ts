import type { ParsedTransaction } from '../types';

/**
 * ============================================================================
 *  IMPORT VALIDATION  (presentation-layer, additive)
 * ============================================================================
 *
 * Shared validation + confidence reporting for every parser (CSV/XLSX/PDF).
 * After a parser produces transactions, this module independently checks them
 * for structural soundness and surfaces a transparent import-confidence report
 * that powers the human-review workflow.
 *
 * It NEVER mutates locked calculations — it inspects parsed rows and returns a
 * report; the UI decides how to present review.
 */

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  transactionId: string;
  level: IssueLevel;
  message: string;
}

export interface ImportConfidence {
  /** 0–1 overall confidence in the extraction. */
  score: number;
  /** Human label for the score. */
  band: 'high' | 'medium' | 'low';
  /** Per-source contributions, for transparency. */
  factors: {
    /** Average per-row category confidence. */
    categoryConfidence: number;
    /** Share of rows with no structural issues. */
    structuralIntegrity: number;
    /** Share of rows with a recognised (non-Uncategorized) category. */
    recognitionRate: number;
  };
}

export interface ValidationReport {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** Rows that need a human to look (errors, warnings, or low confidence). */
  reviewIds: Set<string>;
  confidence: ImportConfidence;
}

const REVIEW_CONFIDENCE = 0.7;

/** Validate a parsed set and compute an import-confidence report. */
export function validateImport(txns: ParsedTransaction[]): ValidationReport {
  const issues: ValidationIssue[] = [];
  const reviewIds = new Set<string>();

  let structurallyOk = 0;
  let recognised = 0;
  let confidenceSum = 0;

  const today = new Date();
  const future = new Date(today.getTime() + 2 * 86_400_000); // small grace window

  for (const t of txns) {
    let rowOk = true;

    // Date sanity
    const d = new Date(t.date + 'T00:00:00');
    if (Number.isNaN(d.getTime())) {
      issues.push({ transactionId: t.id, level: 'error', message: 'Unreadable date.' });
      reviewIds.add(t.id);
      rowOk = false;
    } else if (d > future) {
      issues.push({ transactionId: t.id, level: 'warning', message: 'Date is in the future.' });
      reviewIds.add(t.id);
      rowOk = false;
    }

    // Amount sanity
    if (!Number.isFinite(t.amount) || t.amount === 0) {
      issues.push({ transactionId: t.id, level: 'error', message: 'Missing or zero amount.' });
      reviewIds.add(t.id);
      rowOk = false;
    } else if (Math.abs(t.amount) > 10_000_000) {
      issues.push({ transactionId: t.id, level: 'warning', message: 'Unusually large amount — please confirm.' });
      reviewIds.add(t.id);
    }

    // Merchant sanity
    if (!t.merchant || t.merchant.trim().length < 2) {
      issues.push({ transactionId: t.id, level: 'warning', message: 'Merchant name looks incomplete.' });
      reviewIds.add(t.id);
    }

    // Category confidence
    if (!t.edited && t.confidence < REVIEW_CONFIDENCE) reviewIds.add(t.id);
    if (t.category !== 'Uncategorized') recognised += 1;
    confidenceSum += t.edited ? 1 : t.confidence;

    if (rowOk) structurallyOk += 1;
  }

  const n = Math.max(1, txns.length);
  const categoryConfidence = confidenceSum / n;
  const structuralIntegrity = structurallyOk / n;
  const recognitionRate = recognised / n;

  // Weighted blend → overall import confidence.
  const score =
    categoryConfidence * 0.5 + structuralIntegrity * 0.3 + recognitionRate * 0.2;
  const band: ImportConfidence['band'] = score >= 0.85 ? 'high' : score >= 0.6 ? 'medium' : 'low';

  return {
    issues,
    errorCount: issues.filter((i) => i.level === 'error').length,
    warningCount: issues.filter((i) => i.level === 'warning').length,
    reviewIds,
    confidence: {
      score,
      band,
      factors: { categoryConfidence, structuralIntegrity, recognitionRate },
    },
  };
}
