import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseAmount,
  extractMerchant,
  detectColumns,
  fileSizeLabel,
} from '../normalize';

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------
describe('parseDate', () => {
  it('returns null for empty/blank input', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('   ')).toBeNull();
  });

  it('parses ISO yyyy-mm-dd', () => {
    expect(parseDate('2026-01-15')).toBe('2026-01-15');
    expect(parseDate('2025-12-03')).toBe('2025-12-03');
  });

  it('parses ISO yyyy/mm/dd', () => {
    expect(parseDate('2026/03/08')).toBe('2026-03-08');
  });

  it('parses dd-mm-yyyy (Indian convention)', () => {
    expect(parseDate('15-01-2026')).toBe('2026-01-15');
    expect(parseDate('03-12-2025')).toBe('2025-12-03');
  });

  it('parses dd/mm/yyyy', () => {
    expect(parseDate('15/01/2026')).toBe('2026-01-15');
    expect(parseDate('01/06/2026')).toBe('2026-06-01');
  });

  it('parses dd.mm.yyyy', () => {
    expect(parseDate('15.01.2026')).toBe('2026-01-15');
  });

  it('handles two-digit years (dd/mm/yy)', () => {
    expect(parseDate('15/01/26')).toBe('2026-01-15');
    expect(parseDate('01/06/99')).toBe('1999-06-01');
  });

  it('parses named month "01 May 2026"', () => {
    expect(parseDate('01 May 2026')).toBe('2026-05-01');
    expect(parseDate('15 December 2025')).toBe('2025-12-15');
  });

  it('parses named month "1-May-26"', () => {
    expect(parseDate('1-May-26')).toBe('2026-05-01');
  });

  it('handles ambiguous day/month by preferring day-first', () => {
    // 05/06/2026 => day=5, month=6 (Indian convention)
    expect(parseDate('05/06/2026')).toBe('2026-06-05');
  });

  it('swaps when first field > 12 (clearly a day)', () => {
    expect(parseDate('25/01/2026')).toBe('2026-01-25');
  });

  it('swaps when second field > 12 (clearly a month is the first)', () => {
    // first=01 (could be day or month), second=13 (must be a day) -> swap
    expect(parseDate('01/13/2026')).toBe('2026-01-13');
  });
});

// ---------------------------------------------------------------------------
// parseAmount
// ---------------------------------------------------------------------------
describe('parseAmount', () => {
  it('returns null for empty/blank/invalid input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(undefined as unknown as string)).toBeNull();
    expect(parseAmount(null as unknown as string)).toBeNull();
  });

  it('parses plain numbers', () => {
    expect(parseAmount('1234')).toBe(1234);
    expect(parseAmount('1234.50')).toBe(1234.5);
  });

  it('parses formatted amounts with commas', () => {
    expect(parseAmount('1,234.50')).toBe(1234.5);
    expect(parseAmount('1,25,000')).toBe(125000);
  });

  it('parses amounts with currency symbols', () => {
    expect(parseAmount('₹1,234.50')).toBe(1234.5);
    expect(parseAmount('INR 500')).toBe(500);
  });

  it('handles parenthesised negatives', () => {
    expect(parseAmount('(1,234)')).toBe(-1234);
    expect(parseAmount('(500.00)')).toBe(-500);
  });

  it('handles trailing Dr/Cr markers', () => {
    expect(parseAmount('1234 Dr')).toBe(-1234);
    expect(parseAmount('1234 Cr')).toBe(1234);
    expect(parseAmount('1234.50 DR')).toBe(-1234.5);
  });

  it('handles negative amounts with minus sign', () => {
    expect(parseAmount('-500')).toBe(-500);
    expect(parseAmount('-1,234.00')).toBe(-1234);
  });
});

// ---------------------------------------------------------------------------
// extractMerchant
// ---------------------------------------------------------------------------
describe('extractMerchant', () => {
  it('returns "Unknown" for empty description', () => {
    expect(extractMerchant('')).toBe('Unknown');
  });

  it('detects known brands (Swiggy)', () => {
    expect(extractMerchant('UPI/swiggy@axisbank/Payment')).toBe('Swiggy');
  });

  it('detects known brands (Amazon)', () => {
    expect(extractMerchant('POS 4291 AMAZON INDIA MUMBAI')).toBe('Amazon');
  });

  it('detects known brands (Zomato)', () => {
    expect(extractMerchant('UPI/zomato@hdfc/Food Order')).toBe('Zomato');
  });

  it('detects known brands (Netflix)', () => {
    expect(extractMerchant('AUTOPAY NETFLIX SUBSCRIPTION')).toBe('Netflix');
  });

  it('extracts VPA handle when no known brand', () => {
    expect(extractMerchant('UPI/johndoe@okhdfcbank/Transfer')).toBe('Johndoe');
  });

  it('splits on delimiters and returns first substantive token', () => {
    expect(extractMerchant('NEFT-ACME SOFTWARE PVT LTD-SALARY')).toBe('Acme');
  });

  it('strips noise prefixes like UPI, IMPS, NEFT', () => {
    const result = extractMerchant('IMPS/12345678/RENTAL PAYMENT');
    expect(result).not.toBe('Imps');
  });
});

// ---------------------------------------------------------------------------
// detectColumns
// ---------------------------------------------------------------------------
describe('detectColumns', () => {
  it('detects standard column names', () => {
    const cols = detectColumns(['Date', 'Description', 'Debit', 'Credit', 'Balance']);
    expect(cols.date).toBe('Date');
    expect(cols.description).toBe('Description');
    expect(cols.debit).toBe('Debit');
    expect(cols.credit).toBe('Credit');
    expect(cols.balance).toBe('Balance');
  });

  it('handles Indian bank variants', () => {
    const cols = detectColumns(['Txn Date', 'Narration', 'Withdrawal Amt', 'Deposit Amt', 'Closing Balance']);
    expect(cols.date).toBe('Txn Date');
    expect(cols.description).toBe('Narration');
    expect(cols.debit).toBe('Withdrawal Amt');
    expect(cols.credit).toBe('Deposit Amt');
    expect(cols.balance).toBe('Closing Balance');
  });

  it('detects single amount + type columns', () => {
    const cols = detectColumns(['Date', 'Particulars', 'Amount', 'Dr/Cr', 'Balance']);
    expect(cols.date).toBe('Date');
    expect(cols.description).toBe('Particulars');
    expect(cols.amount).toBe('Amount');
    expect(cols.drcr).toBe('Dr/Cr');
  });

  it('returns null for unrecognized headers', () => {
    const cols = detectColumns(['Foo', 'Bar', 'Baz']);
    expect(cols.date).toBeNull();
    expect(cols.description).toBeNull();
    expect(cols.debit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fileSizeLabel
// ---------------------------------------------------------------------------
describe('fileSizeLabel', () => {
  it('formats bytes', () => {
    expect(fileSizeLabel(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(fileSizeLabel(2048)).toBe('2 KB');
    expect(fileSizeLabel(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(fileSizeLabel(1048576)).toBe('1.0 MB');
    expect(fileSizeLabel(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
