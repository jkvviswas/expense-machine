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
 *  CSV PARSER  (real, presentation-layer, additive)
 * ============================================================================
 *
 * A production-grade, dependency-free CSV statement parser that fulfils the
 * StatementParser contract. It reads the user's actual file, so import is no
 * longer mock for CSV inputs. It never touches locked calculations or data —
 * it returns a normalized ExtractionResult through the registry, exactly like
 * the mock does.
 *
 * Handles:
 *   - Quoted fields, embedded commas, escaped double-quotes ("" → "), CRLF/LF.
 *   - Comma, semicolon and tab delimiters (auto-detected).
 *   - Pre-amble lines above the header row (common in bank exports) by scanning
 *     for the first row that looks like a header.
 *   - Varying column names, debit/credit or single signed amount, Dr/Cr flags.
 */

// ----------------------------------------------------------------------------
// Tokenizer (RFC-4180-aware)
// ----------------------------------------------------------------------------

/** Split raw CSV text into a matrix of string cells. */
export function tokenizeCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  // Normalize line endings handled inline (we treat \r\n and \n).

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // swallow; the following \n (if any) finalizes the row
      if (text[i + 1] !== '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
    } else {
      field += c;
    }
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Pick the delimiter that yields the most consistent column count. */
function detectDelimiter(sample: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestScore = -1;
  for (const d of candidates) {
    const lines = sample.split(/\r?\n/).slice(0, 10).filter(Boolean);
    if (lines.length === 0) continue;
    const counts = lines.map((l) => l.split(d).length);
    const max = Math.max(...counts);
    if (max <= 1) continue;
    // score: prefer delimiters that produce many, consistent columns
    const consistent = counts.filter((c) => c === max).length;
    const score = max * 10 + consistent;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/**
 * Find the header row: the first row whose cells look like field labels
 * (contain date/amount/description-ish words) rather than data.
 */
function findHeaderRow(matrix: string[][]): number {
  const HINTS = ['date', 'narration', 'description', 'particular', 'debit', 'credit', 'amount', 'withdrawal', 'deposit', 'balance', 'type', 'remarks', 'details'];
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const cells = matrix[i].map((c) => c.trim().toLowerCase());
    const hits = cells.filter((c) => HINTS.some((h) => c.includes(h))).length;
    if (hits >= 2) return i;
  }
  return 0; // assume first row
}

// ----------------------------------------------------------------------------
// StatementParser implementation
// ----------------------------------------------------------------------------

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export const csvParser: StatementParser = {
  id: 'csv-generic',

  canHandle(input: ImportInput): boolean {
    // Only claim real CSV inputs that carry an actual file to read.
    return input.kind === 'csv' && !!input.file;
  },

  async parse(input: ImportInput): Promise<ExtractionResult> {
    if (!input.file) {
      throw new Error('CSV parser requires a file');
    }
    const text = await readFileText(input.file);
    const delimiter = detectDelimiter(text.slice(0, 4000));
    const matrix = tokenizeCsv(text, delimiter);

    if (matrix.length === 0) {
      throw new Error('The CSV file appears to be empty.');
    }

    const headerIdx = findHeaderRow(matrix);
    const headers = matrix[headerIdx].map((h) => h.trim());
    const cols = detectColumns(headers);

    if (!cols.date || (!cols.amount && !cols.debit && !cols.credit)) {
      throw new Error(
        'Could not find a date column and an amount (or debit/credit) column in this CSV.',
      );
    }

    // Pre-amble lines (above the header row) often carry account holder /
    // number / bank name in Indian bank exports.
    const preamble = matrix.slice(0, headerIdx).map((r) => r.join(' '));
    const headerInfo = extractStatementHeaderInfo(preamble);

    const rows: RawRow[] = matrix.slice(headerIdx + 1).map((cells) => {
      const obj: RawRow = {};
      headers.forEach((h, i) => {
        obj[h] = (cells[i] ?? '').trim();
      });
      return obj;
    });

    const result = normalizeRows(rows, cols, {
      fileName: input.fileName,
      fileType: 'CSV',
      fileSizeLabel: input.file ? fileSizeLabel(input.file.size) : '—',
      headerInfo,
    });

    if (result.transactions.length === 0) {
      throw new Error('No transactions could be read from this CSV.');
    }

    return { statement: result.statement, transactions: result.transactions };
  },
};
