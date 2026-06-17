import type { ParsedTransaction, StatementMeta } from '../types';

/**
 * ============================================================================
 *  PARSING LAYER — the seam between the UI and any future real extractor.
 * ============================================================================
 *
 * The Import Center UI never imports mock data directly. It depends only on
 * this contract. Today a mock provider fulfils it; tomorrow a real CSV/PDF/
 * bank-statement parser can fulfil the exact same contract and the UI will not
 * change.
 *
 * To go from mock → real extraction later, you implement `StatementParser`
 * for a given source and register it — nothing in `components/` is touched.
 */

/** The normalized result every parser (mock or real) must return. */
export interface ExtractionResult {
  statement: StatementMeta;
  transactions: ParsedTransaction[];
}

/** What the user handed us. Real parsers branch on `kind` + `mimeType`. */
export interface ImportInput {
  kind: 'pdf' | 'csv' | 'xlsx' | 'unknown';
  fileName: string;
  /** Present for real parsing; undefined in mock mode. */
  file?: File;
}

/**
 * The single interface a real engine implements later. `canHandle` lets the
 * registry pick the right parser for an input; `parse` does the extraction.
 * Returning a Promise keeps the UI identical whether extraction is instant
 * (mock) or async (real OCR / server round-trip).
 */
export interface StatementParser {
  readonly id: string;
  canHandle(input: ImportInput): boolean;
  parse(input: ImportInput): Promise<ExtractionResult>;
}

/** Classify a filename into an ImportInput. UI calls this on file choose. */
export function toImportInput(fileName: string, file?: File): ImportInput {
  const lower = fileName.toLowerCase();
  const kind: ImportInput['kind'] = lower.endsWith('.pdf')
    ? 'pdf'
    : lower.endsWith('.csv')
      ? 'csv'
      : lower.endsWith('.xlsx') || lower.endsWith('.xls')
        ? 'xlsx'
        : 'unknown';
  return { kind, fileName, file };
}
