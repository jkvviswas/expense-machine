/**
 * ============================================================================
 *  STATEMENT METADATA EXTRACTION  (Phase 1, presentation-layer, additive)
 * ============================================================================
 *
 * Pulls structured fields out of a noisy narration / description string so the
 * ledger can store them as first-class typed fields instead of leaving them
 * buried in free text. Pure string parsing — deterministic, no network.
 *
 * Indian bank statements encode a lot in the narration, e.g.:
 *   "UPI/DR/412345678901/SWIGGY/YESB/swiggy@ybl/Payment"
 *   "NEFT CR-HDFC0000123-ACME PVT LTD-N123456789012345"
 *   "IMPS/P2A/412300012345/JOHN/..."
 *   "POS 4321XXXXXXXX1234 AMAZON"
 */

export interface ExtractedMeta {
  referenceNo?: string;
  transactionId?: string;
  upiRef?: string;
  ifsc?: string;
  maskedAccount?: string;
}

const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/;
const UPI_VPA_RE = /([a-z0-9._-]+@[a-z]{2,})/i;
// A long digit run (12–16+) is typically a UTR / reference / transaction id.
const LONG_REF_RE = /\b(\d{12,18})\b/;
// UTR-style: a single letter prefix followed by 12+ digits (e.g. N123456789012345).
const UTR_RE = /\b([A-Z]\d{12,18})\b/;
// UPI/NEFT/IMPS/RTGS reference often appears right after the rail keyword.
const RAIL_REF_RE = /\b(?:UPI|NEFT|IMPS|RTGS)[\/\s:-]+(?:[A-Z]{2,4}[\/\s:-]+)?(\w{6,})/i;
// Masked card/account like 4321XXXXXXXX1234 or XXXX1234.
const MASKED_RE = /\b((?:\d{2,6}[xX*]{2,}\d{2,6})|(?:[xX*]{2,}\d{3,6}))\b/;

/** True if `s` matches the IFSC pattern (4 letters + 0 + 6 alphanumeric). */
function looksLikeIfsc(s: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s);
}

export function extractMeta(text: string): ExtractedMeta {
  if (!text) return {};
  const meta: ExtractedMeta = {};

  const ifsc = text.match(IFSC_RE);
  if (ifsc) meta.ifsc = ifsc[1];

  const vpa = text.match(UPI_VPA_RE);
  if (vpa) meta.upiRef = vpa[1].toLowerCase();

  const masked = text.match(MASKED_RE);
  if (masked) meta.maskedAccount = masked[1];

  // Preference order: UTR-style (letter+digits) > rail-anchored (excluding
  // anything that's actually an IFSC code) > a plain long digit run.
  const utr = text.match(UTR_RE);
  const rail = text.match(RAIL_REF_RE);
  const railRef = rail && /\d/.test(rail[1]) && !looksLikeIfsc(rail[1].toUpperCase()) ? rail[1] : null;
  const longRef = text.match(LONG_REF_RE);

  const ref = (utr ? utr[1] : null) ?? railRef ?? (longRef ? longRef[1] : null);
  if (ref) {
    meta.referenceNo = ref;
    // When a distinct 12+ digit numeric id exists, treat it as the txn id too.
    if (longRef && longRef[1] !== ref) meta.transactionId = longRef[1];
    else if (/^\d{12,}$/.test(ref)) meta.transactionId = ref;
  }

  return meta;
}

export interface StatementHeaderInfo {
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
}

const BANK_NAMES: [RegExp, string][] = [
  [/hdfc bank/i, 'HDFC Bank'],
  [/\bhdfc\b/i, 'HDFC Bank'],
  [/icici bank/i, 'ICICI Bank'],
  [/\bicici\b/i, 'ICICI Bank'],
  [/state bank of india|\bsbi\b/i, 'State Bank of India'],
  [/axis bank/i, 'Axis Bank'],
  [/kotak mahindra/i, 'Kotak Mahindra'],
  [/idfc first/i, 'IDFC First'],
  [/yes bank/i, 'YES Bank'],
  [/rbl bank/i, 'RBL Bank'],
  [/punjab national bank|\bpnb\b/i, 'Punjab National Bank'],
  [/bank of baroda/i, 'Bank of Baroda'],
  [/canara bank/i, 'Canara Bank'],
  [/union bank/i, 'Union Bank of India'],
  [/indusind/i, 'IndusInd Bank'],
];

/**
 * Scan the pre-amble lines of a bank statement (above the header row) for
 * account holder name, account number, and bank name. Best-effort and
 * additive — never overwrites anything; absence just leaves fields unset.
 */
export function extractStatementHeaderInfo(lines: string[]): StatementHeaderInfo {
  const info: StatementHeaderInfo = {};
  const text = lines.join('\n');

  for (const [re, label] of BANK_NAMES) {
    if (re.test(text)) { info.bankName = label; break; }
  }

  for (const line of lines) {
    if (!info.accountHolder) {
      const m = line.match(/(?:account holder|customer name|a\/?c holder|name)\s*[:\-]\s*(.+)/i);
      if (m && m[1].trim() && !/^\d+$/.test(m[1].trim())) {
        info.accountHolder = m[1].trim().slice(0, 60);
      }
    }
    if (!info.accountNumber) {
      const m = line.match(/(?:account\s*(?:no\.?|number)|a\/?c\s*(?:no\.?|number))\s*[:\-]?\s*(\d{6,20})/i);
      if (m) info.accountNumber = m[1];
    }
  }

  return info;
}

/**
 * Compare a parsed statement against existing accounts and suggest the best
 * match by last-4 digits and/or bank name. Never auto-selects — purely a
 * suggestion for the user to confirm.
 */
export interface AccountLike {
  id: string;
  name: string;
  bank: string;
  last4: string;
  archived?: boolean;
}

export function suggestAccountMatch<T extends AccountLike>(
  statement: { accountNumber?: string; accountMask?: string; bankName?: string; accountName?: string },
  accounts: T[],
): T | null {
  const digitsFrom = (s?: string) => (s ?? '').replace(/\D/g, '');
  const stmtDigits = digitsFrom(statement.accountNumber) || digitsFrom(statement.accountMask);
  const stmtLast4 = stmtDigits.slice(-4);
  const bankHay = `${statement.bankName ?? ''} ${statement.accountName ?? ''}`.toLowerCase();

  let best: T | null = null;
  let bestScore = 0;
  for (const acc of accounts) {
    if (acc.archived) continue;
    let score = 0;
    if (stmtLast4 && acc.last4 && acc.last4 === stmtLast4) score += 2;
    if (acc.bank && bankHay.includes(acc.bank.toLowerCase())) score += 1;
    if (score > bestScore) { bestScore = score; best = acc; }
  }
  // Require at least a last-4 match (score >= 2) to avoid weak bank-only guesses.
  return bestScore >= 2 ? best : null;
}
