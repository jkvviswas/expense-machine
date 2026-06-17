import type { ExtractionResult, ImportInput, StatementParser } from './types';
import type { StatementMeta } from '../types';
import { fileSizeLabel } from './normalize';

/**
 * ============================================================================
 *  PDF PARSER  (real, presentation-layer, additive)
 * ============================================================================
 *
 * Parses real PDF bank statements end-to-end:
 *   1. Extract a text layer (pdfText.ts, pdfjs-dist) — loaded dynamically.
 *   2. Detect the bank and reconstruct transaction rows (pdfStrategies.ts).
 *   3. Categorize + return a normalized ExtractionResult.
 *
 * IMPORTANT (per product rule): when a real PDF can be parsed, we use the real
 * result — never the mock. The mock is only reached when extraction genuinely
 * cannot proceed: a scanned/image-only PDF (no text layer → would need OCR) or
 * a layout that yields no rows. In those cases the parser throws `PdfFallback`,
 * which the registry catches to route to the mock provider so the demo never
 * breaks. This is also the exact seam where an OCR pipeline would slot in.
 */

/** Thrown when a PDF cannot be parsed to transactions and the caller should fall back. */
export class PdfFallback extends Error {
  readonly reason: 'no-text-layer' | 'no-transactions';
  constructor(reason: 'no-text-layer' | 'no-transactions') {
    super(reason);
    this.name = 'PdfFallback';
    this.reason = reason;
  }
}

function bankMask(fileName: string): string {
  const m = fileName.match(/(\d{4})(?!.*\d)/);
  return m ? `••${m[1]}` : '••••';
}

export const pdfParser: StatementParser = {
  id: 'pdf-statement',

  canHandle(input: ImportInput): boolean {
    return input.kind === 'pdf' && !!input.file;
  },

  async parse(input: ImportInput): Promise<ExtractionResult> {
    if (!input.file) throw new Error('PDF parser requires a file');

    const { extractPdfText } = await import('./pdfText');
    const extracted = await extractPdfText(input.file);

    const { parsePdfLines } = await import('./pdfStrategies');

    // Prefer the embedded text layer. If there is none (scanned/image-only
    // PDF), try the active OCR provider before giving up. Only when neither
    // yields lines do we throw PdfFallback for the labelled sample path.
    let lines = extracted.lines;
    if (!extracted.hasText) {
      const { getOcrProvider } = await import('./ocr');
      const ocr = getOcrProvider();
      if (await ocr.isAvailable()) {
        const result = await ocr.recognise(input.file);
        if (result.lines.length > 0) {
          lines = result.lines;
        } else {
          throw new PdfFallback('no-text-layer');
        }
      } else {
        throw new PdfFallback('no-text-layer');
      }
    }

    const outcome = parsePdfLines(lines);

    if (outcome.transactions.length === 0) {
      throw new PdfFallback('no-transactions');
    }

    // Sort oldest-first and build statement metadata from the parsed rows.
    const txns = [...outcome.transactions].sort((a, b) => a.date.localeCompare(b.date));
    const dates = txns.map((t) => t.date);

    // Statement-level account holder / number, scanned from the whole text
    // layer (these usually sit in a header block, not strictly pre-amble).
    const { extractStatementHeaderInfo } = await import('./extractMeta');
    const headerInfo = extractStatementHeaderInfo(lines.map((l) => l.text));

    const statement: StatementMeta = {
      fileName: input.fileName,
      fileType: 'PDF',
      fileSizeLabel: fileSizeLabel(input.file.size),
      accountName: outcome.bankLabel,
      accountMask: bankMask(input.fileName),
      dateRangeStart: dates[0] ?? '',
      dateRangeEnd: dates[dates.length - 1] ?? '',
      ...(headerInfo.accountHolder ? { accountHolder: headerInfo.accountHolder } : {}),
      ...(headerInfo.accountNumber ? { accountNumber: headerInfo.accountNumber } : {}),
      bankName: headerInfo.bankName ?? outcome.bankLabel,
    };

    return { statement, transactions: txns };
  },
};
