import type { ExtractionResult, ImportInput, StatementParser } from './types';
import { mockParser } from './mockParser';
import { csvParser } from './csvParser';
import { xlsxParser } from './xlsxParser';
import { pdfParser, PdfFallback } from './pdfParser';

/**
 * The parser registry. The UI calls `extractStatement(input)` and never knows
 * or cares which parser ran.
 *
 * Order matters — the first parser whose `canHandle` returns true wins, so
 * specific real parsers are registered BEFORE the generic mock fallback.
 *
 * Real parsers now cover CSV, XLSX and PDF. The mock remains the final
 * catch-all for two cases only:
 *   1. An input with no readable File (e.g. a demo click).
 *   2. A PDF that cannot be parsed to transactions — a scanned/image-only file
 *      (no text layer, would need OCR) or an unrecognized layout. The PDF parser
 *      signals this by throwing `PdfFallback`, which we catch below and route to
 *      the mock so the experience never dead-ends. A real PDF that DOES parse is
 *      always used as-is (never replaced by mock data).
 */
const parsers: StatementParser[] = [
  csvParser, // real: CSV files with a File payload
  xlsxParser, // real: XLSX/XLS files with a File payload
  pdfParser, // real: PDF statements with a text layer
  mockParser, // catch-all (always last)
];

export function registerParser(parser: StatementParser): void {
  // Insert before the trailing mock catch-all.
  parsers.splice(Math.max(parsers.length - 1, 0), 0, parser);
}

export interface ExtractionOutcome extends ExtractionResult {
  /** True when the curated mock provided the data (demo / OCR fallback). */
  fromMock: boolean;
}

/**
 * Single entry point for the UI. Picks the first parser that can handle the
 * input and returns a normalized ExtractionResult. Async so the UI is identical
 * whether extraction is instant (mock) or a real round-trip.
 */
export async function extractStatement(
  input: ImportInput,
): Promise<ExtractionOutcome> {
  const parser = parsers.find((p) => p.canHandle(input)) ?? mockParser;
  try {
    const result = await parser.parse(input);
    return { ...result, fromMock: parser.id === mockParser.id };
  } catch (e) {
    // Only PDF parsing is allowed to fall back to the mock (OCR-needed or
    // unrecognized layout). All other parser errors propagate so the UI can show
    // a real, actionable error message.
    if (e instanceof PdfFallback) {
      const result = await mockParser.parse(input);
      return { ...result, fromMock: true };
    }
    throw e;
  }
}

export type { ExtractionResult, ImportInput };
