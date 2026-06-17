import type { PdfTextLine } from './pdfText';
import { parseDate, parseAmount, extractMerchant } from './normalize';
import { categorize } from './categorize';
import { extractMeta } from './extractMeta';
import type { ParsedTransaction } from '../types';

/**
 * ============================================================================
 *  PDF STATEMENT STRATEGIES  (Phase 16 — bank strategy registry)
 * ============================================================================
 *
 * PDF bank statements have no universal layout, so extraction is strategy-based
 * and registry-driven:
 *
 *   - Each `BankStrategy` declares header fingerprints (for detection with a
 *     confidence score), the date formats it expects, and how its rows are
 *     shaped. Detection returns a 0–1 score so the registry can pick the BEST
 *     match, not merely the first.
 *   - A generic strategy handles the common "date … narration … amount …
 *     [balance]" line shape shared by most Indian statements, as a real (not
 *     mock) fallback when no bank-specific strategy fits well.
 *
 * Every strategy emits `ParsedTransaction[]` with a per-row confidence, then the
 * shared categorization engine assigns categories — so a PDF import behaves
 * exactly like CSV/XLSX downstream. No locked file is touched.
 *
 * Adding a bank = add one entry to STRATEGIES.
 */

export interface PdfParseOutcome {
  bankLabel: string;
  strategyId: string;
  /** 0–1 confidence that the chosen strategy matched this statement. */
  detectionConfidence: number;
  transactions: ParsedTransaction[];
}

interface BankStrategy {
  readonly id: string;
  readonly bankLabel: string;
  /** Header fingerprints; more matches → higher detection confidence. */
  readonly fingerprints: string[];
  /** Parse rows. Receives the reconstructed lines. */
  parse(lines: PdfTextLine[], idPrefix: string): ParsedTransaction[];
}

// Leading date in common Indian statement formats.
const DATE_AT_START =
  /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/;

// Money tokens (₹, commas, decimals, parens, Dr/Cr).
const MONEY_TOKEN = /(?:₹|inr)?\s*-?\(?\d[\d,]*(?:\.\d{1,2})?\)?(?:\s*(?:dr|cr))?/gi;

/** A single reusable row reader, parameterised by how the bank signals sign. */
interface RowOptions {
  /** Which trailing money token is the amount when N tokens are present. */
  amountToken: 'last' | 'secondLast';
  /** How to infer sign when no explicit Dr/Cr is on the row. */
  defaultSign: 'negative' | 'narration';
  /** Whether a running-balance token trails the amount on each row. */
  hasTrailingBalance: boolean;
}

function readRows(
  lines: PdfTextLine[],
  idPrefix: string,
  opts: RowOptions,
): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];
  let idx = 0;
  // Running balance carried across rows — the spine of column-first sign
  // resolution and balance verification. Seeded from the first row's balance.
  let prevBalance: number | null = null;

  for (const line of lines) {
    const dateMatch = line.text.match(DATE_AT_START);
    if (!dateMatch) {
      // Row reconstruction (brief Part 1.2): a line with no leading date and no
      // money token is wrapped narration belonging to the previous transaction.
      // Append it rather than dropping or splitting it into a new row.
      const hasMoney = (line.text.match(MONEY_TOKEN) ?? []).some((m) => /\d/.test(m));
      const cont = line.text.trim();
      if (!hasMoney && cont && out.length > 0 && cont.length < 60) {
        const last = out[out.length - 1];
        const merged = `${last.description} ${cont}`.replace(/\s{2,}/g, ' ').trim();
        last.description = merged;
        last.merchant = extractMerchant(merged);
      }
      continue;
    }
    const iso = parseDate(dateMatch[1]);
    if (!iso) continue;

    const moneyMatches = (line.text.match(MONEY_TOKEN) ?? []).filter((m) => /\d/.test(m));
    if (moneyMatches.length === 0) continue;

    // Amount + (optional) trailing running balance.
    let amountStr: string;
    let balanceVal: number | null = null;
    if (opts.hasTrailingBalance && moneyMatches.length >= 2) {
      amountStr = moneyMatches[moneyMatches.length - 2];
      balanceVal = parseAmount(moneyMatches[moneyMatches.length - 1]);
    } else if (moneyMatches.length >= 2 && opts.amountToken === 'secondLast') {
      amountStr = moneyMatches[moneyMatches.length - 2];
    } else {
      amountStr = moneyMatches[moneyMatches.length - 1];
    }
    const amount = parseAmount(amountStr);
    if (amount === null || amount === 0) continue;

    let narration = line.text.slice(dateMatch[0].length);
    for (const m of moneyMatches) narration = narration.replace(m, ' ');
    narration = narration.replace(/\s{2,}/g, ' ').trim() || 'Transaction';

    const merchant = extractMerchant(narration);
    const lower = line.text.toLowerCase();

    // ---- Sign resolution, column-first (brief Part 1.3) ----------------
    // Priority: (1) running-balance delta — deterministic, never guesses;
    // (2) explicit Dr/Cr or credit/debit keyword; (3) bank default. Narration
    // is the *last* resort, never the primary signal.
    let signed = -Math.abs(amount);
    let signConfidence = 0.55;
    let balanceVerified = false;

    const hasCrWord = /\bcr\b/.test(lower) || /\b(credit|deposit|salary|neft cr|refund|imps cr|interest|cashback)\b/.test(lower);
    const hasDrWord = /\bdr\b/.test(lower) || /\b(debit|withdrawal|pos|atm|purchase|payment)\b/.test(lower);

    if (balanceVal !== null && prevBalance !== null) {
      // Deterministic: the balance went up → credit, down → debit.
      const delta = balanceVal - prevBalance;
      if (Math.abs(Math.abs(delta) - Math.abs(amount)) <= 1.0) {
        // Delta matches the amount → fully reconciled, highest confidence.
        signed = delta >= 0 ? Math.abs(amount) : -Math.abs(amount);
        signConfidence = 0.99;
        balanceVerified = true;
      } else {
        // Balance present but doesn't reconcile (wrapped row / missed token):
        // still trust the delta direction, lower confidence.
        signed = delta >= 0 ? Math.abs(amount) : -Math.abs(amount);
        signConfidence = 0.8;
      }
    } else if (hasCrWord && !hasDrWord) {
      signed = Math.abs(amount);
      signConfidence = 0.9;
    } else if (hasDrWord && !hasCrWord) {
      signed = -Math.abs(amount);
      signConfidence = 0.9;
    } else if (opts.defaultSign === 'negative') {
      signed = -Math.abs(amount);
      signConfidence = 0.65;
    }

    if (balanceVal !== null) prevBalance = balanceVal;

    const guess = categorize(merchant, narration, Math.sign(signed));
    // Row confidence blends categorization with sign certainty; a verified
    // balance dominates so reconciled rows read as high-confidence.
    const confidence = balanceVerified
      ? Math.min(0.99, 0.6 + guess.confidence * 0.4)
      : Math.min(0.97, guess.confidence * 0.6 + signConfidence * 0.4);

    const meta = extractMeta(narration);

    out.push({
      id: `${idPrefix}-${idx++}`,
      date: iso,
      merchant,
      description: narration,
      amount: Math.round(signed * 100) / 100,
      category: guess.category,
      confidence,
      narration,
      ...(balanceVal != null ? { runningBalance: balanceVal } : {}),
      ...(meta.referenceNo ? { referenceNo: meta.referenceNo } : {}),
      ...(meta.transactionId ? { transactionId: meta.transactionId } : {}),
      ...(meta.upiRef ? { upiRef: meta.upiRef } : {}),
      ...(meta.maskedAccount ? { maskedAccount: meta.maskedAccount } : {}),
      ...(meta.ifsc ? { ifsc: meta.ifsc } : {}),
    });
  }

  return out;
}

// ---- Bank strategies --------------------------------------------------------
// HDFC: Date Narration Chq/Ref Value-Date Withdrawal Deposit Balance → amount is
// second-last money token (balance trails).
const hdfc: BankStrategy = {
  id: 'hdfc-pdf',
  bankLabel: 'HDFC Bank',
  fingerprints: ['hdfc bank', 'hdfc', 'we understand your world'],
  parse: (lines) => readRows(lines, 'hdfc', { amountToken: 'secondLast', defaultSign: 'negative', hasTrailingBalance: true }),
};

// ICICI: Date Particulars Withdrawals Deposits Balance → balance trails.
const icici: BankStrategy = {
  id: 'icici-pdf',
  bankLabel: 'ICICI Bank',
  fingerprints: ['icici bank', 'icici'],
  parse: (lines) => readRows(lines, 'icici', { amountToken: 'secondLast', defaultSign: 'negative', hasTrailingBalance: true }),
};

// SBI: Txn Date Value Date Description Ref Debit Credit Balance → balance trails.
const sbi: BankStrategy = {
  id: 'sbi-pdf',
  bankLabel: 'State Bank of India',
  fingerprints: ['state bank of india', 'sbi', 'onlinesbi'],
  parse: (lines) => readRows(lines, 'sbi', { amountToken: 'secondLast', defaultSign: 'negative', hasTrailingBalance: true }),
};

// Axis: Tran Date Particulars Debit Credit Balance → balance trails.
const axis: BankStrategy = {
  id: 'axis-pdf',
  bankLabel: 'Axis Bank',
  fingerprints: ['axis bank', 'axisbank'],
  parse: (lines) => readRows(lines, 'axis', { amountToken: 'secondLast', defaultSign: 'negative', hasTrailingBalance: true }),
};

// Kotak: Date Narration Chq/Ref Withdrawal(Dr) Deposit(Cr) Balance → balance trails.
const kotak: BankStrategy = {
  id: 'kotak-pdf',
  bankLabel: 'Kotak Mahindra Bank',
  fingerprints: ['kotak', 'kotak mahindra', 'kmbl'],
  parse: (lines) => readRows(lines, 'kotak', { amountToken: 'secondLast', defaultSign: 'negative', hasTrailingBalance: true }),
};

// Indian Bank: Date Particulars Debit Credit Balance → balance trails.
const indianBank: BankStrategy = {
  id: 'indianbank-pdf',
  bankLabel: 'Indian Bank',
  fingerprints: ['indian bank', 'indianbank', 'allahabad bank'],
  parse: (lines) => readRows(lines, 'indianbank', { amountToken: 'secondLast', defaultSign: 'negative', hasTrailingBalance: true }),
};

// Generic: single-amount line shape, no trailing balance assumption.
const generic: BankStrategy = {
  id: 'generic-pdf',
  bankLabel: 'Imported Account',
  fingerprints: [],
  parse: (lines) => readRows(lines, 'pdf', { amountToken: 'last', defaultSign: 'negative', hasTrailingBalance: false }),
};

const STRATEGIES: BankStrategy[] = [hdfc, icici, sbi, axis, kotak, indianBank, generic];

/** Count fingerprint hits in the first ~25 lines → detection confidence. */
function detectionScore(s: BankStrategy, head: string): number {
  if (s.fingerprints.length === 0) return 0.4; // generic baseline
  const hits = s.fingerprints.filter((f) => head.includes(f)).length;
  if (hits === 0) return 0;
  return Math.min(0.98, 0.7 + hits * 0.12);
}

/** Pick the highest-confidence strategy, then parse. */
export function parsePdfLines(lines: PdfTextLine[]): PdfParseOutcome {
  const head = lines.slice(0, 25).map((l) => l.text.toLowerCase()).join(' ');

  let best: BankStrategy = generic;
  let bestScore = detectionScore(generic, head);
  for (const s of STRATEGIES) {
    const score = detectionScore(s, head);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }

  return {
    bankLabel: best.bankLabel,
    strategyId: best.id,
    detectionConfidence: bestScore,
    transactions: best.parse(lines, best.id),
  };
}

/** Exposed for diagnostics / the review UI. */
export const supportedBanks = STRATEGIES.filter((s) => s.fingerprints.length > 0).map((s) => ({
  id: s.id,
  label: s.bankLabel,
}));
