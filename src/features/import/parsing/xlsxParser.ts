import type { ExtractionResult, ImportInput, StatementParser } from './types';
import {
  detectColumns,
  normalizeRows,
  fileSizeLabel,
  type RawRow,
} from './normalize';
import { extractStatementHeaderInfo } from './extractMeta';

/**
 * ============================================================================
 *  XLSX PARSER  (real, presentation-layer, additive)
 * ============================================================================
 *
 * Reads .xlsx / .xls bank exports with SheetJS (already a project dependency,
 * used by the Excel export). Shares the EXACT normalization + categorization
 * layer as the CSV parser — the only XLSX-specific work is turning a worksheet
 * into a matrix of strings and locating the header row. The Import UX is
 * identical regardless of source.
 *
 * Touches no locked file; returns a normalized ExtractionResult via the
 * registry like every other parser.
 */

const HINTS = ['date', 'narration', 'description', 'particular', 'debit', 'credit', 'amount', 'withdrawal', 'deposit', 'balance', 'type', 'remarks', 'details'];

/** Locate the header row inside a sheet matrix (banks add title pre-amble). */
function findHeaderRow(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const cells = matrix[i].map((c) => String(c ?? '').trim().toLowerCase());
    const hits = cells.filter((c) => HINTS.some((h) => c.includes(h))).length;
    if (hits >= 2) return i;
  }
  return 0;
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export const xlsxParser: StatementParser = {
  id: 'xlsx-generic',

  canHandle(input: ImportInput): boolean {
    return input.kind === 'xlsx' && !!input.file;
  },

  async parse(input: ImportInput): Promise<ExtractionResult> {
    if (!input.file) {
      throw new Error('XLSX parser requires a file');
    }
    // SheetJS is heavy; load it only when an XLSX import actually happens.
    const XLSX = await import('xlsx');
    const buffer = await readFileBuffer(input.file);
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });

    // Use the first non-empty sheet.
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('The spreadsheet has no sheets.');
    const sheet = wb.Sheets[sheetName];

    // Matrix of raw strings; defval keeps column alignment for sparse rows.
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }) as unknown as string[][];

    if (!matrix || matrix.length === 0) {
      throw new Error('The spreadsheet appears to be empty.');
    }

    const headerIdx = findHeaderRow(matrix);
    const headers = (matrix[headerIdx] ?? []).map((h) => String(h ?? '').trim());
    const cols = detectColumns(headers);

    if (!cols.date || (!cols.amount && !cols.debit && !cols.credit)) {
      throw new Error(
        'Could not find a date column and an amount (or debit/credit) column in this spreadsheet.',
      );
    }

    const rows: RawRow[] = matrix.slice(headerIdx + 1).map((cells) => {
      const obj: RawRow = {};
      headers.forEach((h, i) => {
        obj[h] = String(cells[i] ?? '').trim();
      });
      return obj;
    });

    const preamble = matrix.slice(0, headerIdx).map((r) => r.map((c) => String(c ?? '')).join(' '));
    const headerInfo = extractStatementHeaderInfo(preamble);

    const result = normalizeRows(rows, cols, {
      fileName: input.fileName,
      fileType: 'XLSX',
      fileSizeLabel: fileSizeLabel(input.file.size),
      headerInfo,
    });

    if (result.transactions.length === 0) {
      throw new Error('No transactions could be read from this spreadsheet.');
    }

    return { statement: result.statement, transactions: result.transactions };
  },
};
