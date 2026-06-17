import type { ParsedTransaction, StatementMeta } from '../types';
import type { ExtractionResult } from './types';
import { categorize } from './categorize';
import { extractMeta, type StatementHeaderInfo } from './extractMeta';

/**
 * ============================================================================
 *  NORMALIZATION LAYER  (presentation-layer, additive)
 * ============================================================================
 *
 * The shared backbone for every real, row-based parser (CSV + XLSX). It turns
 * loosely-structured tabular rows from any bank export into the normalized
 * `ParsedTransaction[]` the Import UI already consumes — without ever touching
 * the locked ledger, locked calculations, or the existing UI contract.
 *
 * Responsibilities:
 *   1. Detect which raw columns mean date / description / debit / credit /
 *      amount / balance, across the many header conventions Indian banks use.
 *   2. Parse messy dates (dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd, "01 May 2026"…).
 *   3. Resolve sign: separate debit/credit columns, a Dr/Cr flag, or a single
 *      signed amount column.
 *   4. Extract a clean merchant name from a noisy narration string.
 *   5. Run the shared categorization engine.
 *   6. Compose statement metadata (account hint, mask, date range).
 *
 * Nothing here is bank-specific beyond header aliases and narration cleanup;
 * adding a new bank usually means adding aliases, not new code paths.
 */

// ----------------------------------------------------------------------------
// Column detection
// ----------------------------------------------------------------------------

export type RawRow = Record<string, string>;

export interface ColumnMap {
  date: string | null;
  description: string | null;
  debit: string | null;
  credit: string | null;
  amount: string | null; // single signed/unsigned amount column
  drcr: string | null; // a Dr/Cr type flag column
  balance: string | null;
}

const ALIASES = {
  date: ['date', 'txn date', 'transaction date', 'value date', 'posting date', 'tran date', 'date of transaction'],
  description: ['description', 'narration', 'particulars', 'details', 'remarks', 'transaction details', 'transaction remarks', 'merchant', 'payee', 'memo'],
  debit: ['debit', 'withdrawal', 'withdrawal amt', 'withdrawal amount', 'debit amount', 'dr', 'paid out', 'amount debited', 'withdrawal (dr)', 'debit(dr)'],
  credit: ['credit', 'deposit', 'deposit amt', 'deposit amount', 'credit amount', 'cr', 'paid in', 'amount credited', 'deposit (cr)', 'credit(cr)'],
  amount: ['amount', 'transaction amount', 'amount (inr)', 'amount inr', 'txn amount', 'value'],
  drcr: ['type', 'dr/cr', 'drcr', 'cr/dr', 'transaction type', 'debit/credit'],
  balance: ['balance', 'closing balance', 'available balance', 'running balance', 'balance amount'],
};

function norm(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[._]/g, ' ').trim();
}

/** Find the best-matching real header for each logical field. */
export function detectColumns(headers: string[]): ColumnMap {
  const normalized = headers.map((h) => ({ raw: h, n: norm(h) }));

  const find = (aliases: string[]): string | null => {
    // exact match first
    for (const a of aliases) {
      const hit = normalized.find((h) => h.n === a);
      if (hit) return hit.raw;
    }
    // then contains
    for (const a of aliases) {
      const hit = normalized.find((h) => h.n.includes(a));
      if (hit) return hit.raw;
    }
    return null;
  };

  return {
    date: find(ALIASES.date),
    description: find(ALIASES.description),
    debit: find(ALIASES.debit),
    credit: find(ALIASES.credit),
    amount: find(ALIASES.amount),
    drcr: find(ALIASES.drcr),
    balance: find(ALIASES.balance),
  };
}

// ----------------------------------------------------------------------------
// Date parsing
// ----------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fourDigitYear(y: number): number {
  if (y >= 100) return y;
  // 2-digit year: 00–79 → 2000s, 80–99 → 1900s (statements are recent).
  return y < 80 ? 2000 + y : 1900 + y;
}

/**
 * Parse a wide range of date formats into ISO yyyy-mm-dd.
 * Prefers day-first (Indian convention) when ambiguous. Returns null if
 * unparseable so the caller can skip the row.
 */
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO yyyy-mm-dd (or yyyy/mm/dd)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }

  // dd-mm-yyyy / dd/mm/yy / dd.mm.yyyy  (day-first preferred)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let d = +m[1];
    let mo = +m[2];
    const y = fourDigitYear(+m[3]);
    // If the first field can't be a day but the second can, swap (mm-dd).
    if (d > 12 && mo <= 12) {
      // already day-first, fine
    } else if (d <= 12 && mo > 12) {
      [d, mo] = [mo, d];
    }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }

  // "01 May 2026" / "1-May-26" / "May 1, 2026" / "01 May"
  const named = s.toLowerCase().replace(/,/g, ' ').replace(/[-/]/g, ' ');
  const parts = named.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    let d: number | null = null;
    let mo: number | null = null;
    let y: number | null = null;
    for (const p of parts) {
      const mon = MONTHS[p.slice(0, 3)];
      if (mon && mo === null) {
        mo = mon;
        continue;
      }
      const num = +p;
      if (!Number.isNaN(num)) {
        if (num > 31) y = fourDigitYear(num);
        else if (d === null) d = num;
        else if (y === null) y = fourDigitYear(num);
      }
    }
    if (mo !== null && d !== null) {
      const year = y ?? new Date().getFullYear();
      return `${year}-${pad(mo)}-${pad(d)}`;
    }
  }

  // Last resort: let the engine try, but only accept a sane result.
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Amount parsing
// ----------------------------------------------------------------------------

/** Parse a money cell ("₹1,234.50", "1,234.50 Cr", "(1234)", "-1234") → number. */
export function parseAmount(raw: string): number | null {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  let sign = 1;
  // Parenthesised negatives: (1,234) → -1234
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  // Trailing Dr/Cr markers
  if (/\bdr\b/i.test(s)) sign = -1;
  if (/\bcr\b/i.test(s)) sign = 1;

  // Strip currency symbols, letters, commas, spaces — keep digits, dot, minus.
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return Math.abs(n) * (n < 0 ? -1 : sign);
}

// ----------------------------------------------------------------------------
// Merchant extraction
// ----------------------------------------------------------------------------

const NOISE_PREFIXES = [
  'upi', 'imps', 'neft', 'rtgs', 'pos', 'ach', 'atm', 'mandate', 'autopay',
  'auto pay', 'auto-pay', 'ecs', 'inb', 'mmt', 'tpt', 'vps', 'nft', 'ib',
  'cr', 'dr', 'p2a', 'p2m', 'p2p',
];

/**
 * Derive a clean, human merchant name from a noisy narration.
 * "UPI/swiggy@axisbank/Payment"          → "Swiggy"
 * "POS 4291 AMAZON INDIA MUMBAI"          → "Amazon India"
 * "NEFT-ACME SOFTWARE PVT LTD-SALARY"     → "Acme Software Pvt Ltd"
 */
/**
 * High-confidence brand names. When any of these appears anywhere in the
 * narration, it identifies the merchant more reliably than positional
 * token-splitting (which breaks on POS/IMPS/NEFT layouts where the brand
 * isn't the first segment). Checked case-insensitively as a substring.
 */
const KNOWN_BRANDS: [string, string][] = [
  ['swiggy', 'Swiggy'], ['zomato', 'Zomato'], ['rapido', 'Rapido'],
  ['uber', 'Uber'], ['ola', 'Ola'], ['amazon', 'Amazon'], ['flipkart', 'Flipkart'],
  ['bigbasket', 'BigBasket'], ['blinkit', 'Blinkit'], ['netflix', 'Netflix'],
  ['spotify', 'Spotify'], ['airtel', 'Airtel'], ['jio', 'Jio'], ['myntra', 'Myntra'],
  ['ajio', 'Ajio'], ['nykaa', 'Nykaa'], ['meesho', 'Meesho'], ['zepto', 'Zepto'],
  ['dunzo', 'Dunzo'], ['instamart', 'Instamart'], ['cred', 'CRED'],
  ['lic', 'LIC'], ['hdfc life', 'HDFC Life'], ['icici lombard', 'ICICI Lombard'],
  ['star health', 'Star Health'], ['tata power', 'Tata Power'],
  ['bajaj finserv', 'Bajaj Finserv'], ['bajaj finance', 'Bajaj Finserv'],
  ['irctc', 'IRCTC'], ['makemytrip', 'MakeMyTrip'], ['bookmyshow', 'BookMyShow'],
];

export function extractMerchant(description: string): string {
  if (!description) return 'Unknown';
  let text = description.trim();
  const lower = text.toLowerCase();

  // A recognized brand anywhere in the narration beats positional parsing —
  // critical for POS/IMPS/NEFT layouts where the brand isn't the first token,
  // and ensures consistent merchant grouping for merchant learning. Word
  // boundaries avoid false positives (e.g. "cred" inside "credit").
  for (const [needle, label] of KNOWN_BRANDS) {
    const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return label;
  }

  // Prefer the UPI VPA handle as the merchant when present.
  const vpa = text.match(/([a-z0-9][a-z0-9._-]{2,})@[a-z]+/i);
  if (vpa) {
    return titleCase(vpa[1].replace(/[._-]+/g, ' '));
  }

  // Split on common delimiters and drop noise tokens / pure numbers.
  const tokens = text
    .replace(/\b(?:\d{2,6}[xX*]{2,}\d{2,6}|[xX*]{2,}\d{3,6})\b/g, ' ')
    .split(/[\/|:\-_\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !NOISE_PREFIXES.includes(t.toLowerCase()))
    .filter((t) => !/^\d+$/.test(t)) // pure reference numbers
    .filter((t) => !/^x+\d+$/i.test(t)) // masked card like xxxx1234
    .filter((t) => !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(t)); // IFSC-shaped codes

  if (tokens.length === 0) return titleCase(text.slice(0, 32));

  // The first substantive token is usually the merchant; cap length.
  const candidate = tokens[0].replace(/\s{2,}/g, ' ').slice(0, 40).trim();
  return titleCase(candidate);
}

function titleCase(s: string): string {
  const lower = s.toLowerCase();
  return lower
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      // Keep short acronyms uppercase (e.g. "HDFC", "SBI", "IRCTC").
      if (w.length <= 4 && /^[a-z]+$/.test(w) && isLikelyAcronym(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

const ACRONYMS = new Set(['hdfc', 'sbi', 'icici', 'idfc', 'rbl', 'irctc', 'iocl', 'bpcl', 'hpcl', 'kfc', 'pvr', 'inox', 'dth', 'nps', 'ppf', 'emi', 'upi', 'atm']);
function isLikelyAcronym(w: string): boolean {
  return ACRONYMS.has(w);
}

// ----------------------------------------------------------------------------
// Row → ParsedTransaction
// ----------------------------------------------------------------------------

export interface NormalizeOptions {
  fileName: string;
  fileType: 'CSV' | 'XLSX';
  fileSizeLabel: string;
  /** Optional account hint parsed from the file (rare); falls back to filename. */
  accountHint?: string;
  /** Best-effort statement header info (account holder/number, bank name). */
  headerInfo?: StatementHeaderInfo;
}

export interface NormalizeResult extends ExtractionResult {
  /** Rows the parser saw but could not turn into a transaction. */
  skipped: number;
}

/**
 * Turn detected columns + raw rows into a full ExtractionResult, including
 * categorization and statement metadata. Pure and deterministic.
 */
export function normalizeRows(
  rows: RawRow[],
  cols: ColumnMap,
  opts: NormalizeOptions,
): NormalizeResult {
  const transactions: ParsedTransaction[] = [];
  let skipped = 0;
  let idx = 0;

  for (const row of rows) {
    const dateRaw = cols.date ? row[cols.date] : '';
    const iso = parseDate(dateRaw ?? '');
    if (!iso) {
      skipped++;
      continue;
    }

    // Resolve amount + sign.
    let amount: number | null = null;
    if (cols.debit || cols.credit) {
      const debit = cols.debit ? parseAmount(row[cols.debit] ?? '') : null;
      const credit = cols.credit ? parseAmount(row[cols.credit] ?? '') : null;
      if (credit && credit !== 0) amount = Math.abs(credit);
      else if (debit && debit !== 0) amount = -Math.abs(debit);
    } else if (cols.amount) {
      const base = parseAmount(row[cols.amount] ?? '');
      if (base !== null) {
        amount = base;
        // Apply a Dr/Cr flag column if the amount itself was unsigned.
        if (cols.drcr) {
          const flag = (row[cols.drcr] ?? '').toLowerCase();
          if (/(^|\b)(dr|debit|withdrawal)\b/.test(flag)) amount = -Math.abs(base);
          else if (/(^|\b)(cr|credit|deposit)\b/.test(flag)) amount = Math.abs(base);
        }
      }
    }

    if (amount === null || amount === 0) {
      skipped++;
      continue;
    }

    const description = (cols.description ? row[cols.description] : '')?.trim() || 'Transaction';
    const merchant = extractMerchant(description);
    const guess = categorize(merchant, description, Math.sign(amount));
    const meta = extractMeta(description);
    const runningBalance = cols.balance ? parseAmount(row[cols.balance] ?? '') : null;

    transactions.push({
      id: `imp-${idx++}`,
      date: iso,
      merchant,
      description,
      amount: Math.round(amount * 100) / 100,
      category: guess.category,
      confidence: guess.confidence,
      narration: description,
      ...(runningBalance != null ? { runningBalance } : {}),
      ...(meta.referenceNo ? { referenceNo: meta.referenceNo } : {}),
      ...(meta.transactionId ? { transactionId: meta.transactionId } : {}),
      ...(meta.upiRef ? { upiRef: meta.upiRef } : {}),
      ...(meta.maskedAccount ? { maskedAccount: meta.maskedAccount } : {}),
      ...(meta.ifsc ? { ifsc: meta.ifsc } : {}),
    });
  }

  // Sort oldest-first for a natural statement read.
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // Derive opening/closing balance from the running-balance column when present:
  // opening = (first row's balance) − (first row's amount); closing = last row's
  // balance. This lets us seed the ledger with the true starting bank balance.
  let openingBalance: number | undefined;
  let closingBalance: number | undefined;
  const firstWithBal = transactions.find((t) => t.runningBalance != null);
  const lastWithBal = [...transactions].reverse().find((t) => t.runningBalance != null);
  if (firstWithBal?.runningBalance != null) {
    openingBalance = Math.round((firstWithBal.runningBalance - firstWithBal.amount) * 100) / 100;
  }
  if (lastWithBal?.runningBalance != null) {
    closingBalance = lastWithBal.runningBalance;
  }

  const dates = transactions.map((t) => t.date).sort();
  const statement: StatementMeta = {
    fileName: opts.fileName,
    fileType: opts.fileType,
    fileSizeLabel: opts.fileSizeLabel,
    accountName: opts.accountHint ?? opts.headerInfo?.bankName ?? accountFromName(opts.fileName),
    accountMask: maskFromName(opts.fileName),
    dateRangeStart: dates[0] ?? '',
    dateRangeEnd: dates[dates.length - 1] ?? '',
    ...(opts.headerInfo?.accountHolder ? { accountHolder: opts.headerInfo.accountHolder } : {}),
    ...(opts.headerInfo?.accountNumber ? { accountNumber: opts.headerInfo.accountNumber } : {}),
    ...(opts.headerInfo?.bankName ? { bankName: opts.headerInfo.bankName } : {}),
    ...(openingBalance != null ? { openingBalance } : {}),
    ...(closingBalance != null ? { closingBalance } : {}),
  };

  return { statement, transactions, skipped };
}

/** Guess a friendly account label from the filename (e.g. "HDFC_..." ). */
function accountFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  const banks: [string, string][] = [
    ['hdfc', 'HDFC Bank'],
    ['icici', 'ICICI Bank'],
    ['sbi', 'State Bank of India'],
    ['axis', 'Axis Bank'],
    ['kotak', 'Kotak Mahindra'],
    ['idfc', 'IDFC First'],
    ['yes', 'YES Bank'],
    ['rbl', 'RBL Bank'],
  ];
  for (const [k, label] of banks) {
    if (lower.includes(k)) return label;
  }
  return 'Imported Account';
}

function maskFromName(fileName: string): string {
  const m = fileName.match(/(\d{4})(?!.*\d)/);
  return m ? `••${m[1]}` : '••••';
}

/** Human-readable file size from bytes. */
export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
