import type { ParsedTransaction, StatementMeta, RecentImport } from '../types';

/**
 * India-first sample data for the Import Center.
 * A believable HDFC Bank statement for May 2026: UPI payments, merchant
 * spends, salary credit, utility bills, subscriptions and investments.
 * Amounts and merchants are realistic for an Indian user. No placeholders.
 *
 * This lives in the parsing layer because it is the mock provider's payload —
 * the UI never imports it directly (see ./mockParser.ts and ./registry.ts).
 */

export const indianStatement: StatementMeta = {
  fileName: 'HDFC_Statement_May_2026.pdf',
  fileType: 'PDF',
  fileSizeLabel: '1.8 MB',
  accountName: 'HDFC Bank · Savings',
  accountMask: '••6021',
  dateRangeStart: '2026-05-01',
  dateRangeEnd: '2026-05-31',
};

/**
 * Representative extracted transactions shown in Extraction/Review.
 * The statement "contains" 127 (see detectedSummary) — these are the
 * normalized rows the UI renders; a real parser would return the full set.
 */
export const indianTransactions: ParsedTransaction[] = [
  { id: 't01', date: '2026-05-01', merchant: 'Tata Power', description: 'Electricity bill · April', amount: -2340, category: 'Utilities', confidence: 0.97 },
  { id: 't02', date: '2026-05-01', merchant: 'Airtel', description: 'Postpaid · UPI/AUTOPAY', amount: -799, category: 'Utilities', confidence: 0.96 },
  { id: 't03', date: '2026-05-02', merchant: 'Swiggy', description: 'UPI/swiggy@axisbank', amount: -428, category: 'Food', confidence: 0.95 },
  { id: 't04', date: '2026-05-02', merchant: 'Rapido', description: 'UPI/rapido.qr@ybl', amount: -64, category: 'Transport', confidence: 0.93 },
  { id: 't05', date: '2026-05-03', merchant: 'BigBasket', description: 'UPI/bigbasket@hdfcbank', amount: -1864, category: 'Food', confidence: 0.94 },
  { id: 't06', date: '2026-05-04', merchant: 'Amazon India', description: 'UPI/amazonpay@apl', amount: -2199, category: 'Shopping', confidence: 0.7 },
  { id: 't07', date: '2026-05-05', merchant: 'Jio Fiber', description: 'Broadband · UPI/AUTOPAY', amount: -999, category: 'Utilities', confidence: 0.97 },
  { id: 't08', date: '2026-05-06', merchant: 'Zomato', description: 'UPI/zomato@paytm', amount: -612, category: 'Food', confidence: 0.95 },
  { id: 't09', date: '2026-05-07', merchant: 'Uber', description: 'UPI/uberindia@axisbank', amount: -276, category: 'Transport', confidence: 0.92 },
  { id: 't10', date: '2026-05-08', merchant: 'BookMyShow', description: 'UPI/bookmyshow@icici', amount: -940, category: 'Entertainment', confidence: 0.94 },
  { id: 't11', date: '2026-05-09', merchant: 'Reliance Fresh', description: 'POS purchase · card ••6021', amount: -1532, category: 'Food', confidence: 0.9 },
  { id: 't12', date: '2026-05-10', merchant: 'Apollo Pharmacy', description: 'UPI/apollo247@ybl', amount: -486, category: 'Healthcare', confidence: 0.91 },
  { id: 't13', date: '2026-05-11', merchant: 'Netflix India', description: 'UPI/AUTOPAY · monthly', amount: -649, category: 'Entertainment', confidence: 0.96 },
  { id: 't14', date: '2026-05-12', merchant: 'Flipkart', description: 'UPI/flipkart@axisbank', amount: -3499, category: 'Shopping', confidence: 0.62 },
  { id: 't15', date: '2026-05-13', merchant: 'Indian Oil', description: 'Fuel · card ••6021', amount: -2000, category: 'Transport', confidence: 0.88 },
  { id: 't16', date: '2026-05-14', merchant: 'Spotify', description: 'UPI/AUTOPAY · Premium', amount: -119, category: 'Entertainment', confidence: 0.95 },
  { id: 't17', date: '2026-05-15', merchant: 'Cult.fit', description: 'UPI/cultfit@icici', amount: -1499, category: 'Healthcare', confidence: 0.85 },
  { id: 't18', date: '2026-05-15', merchant: 'Acme Software Pvt Ltd', description: 'NEFT · SALARY MAY 2026', amount: 112000, category: 'Income', confidence: 0.99 },
  { id: 't19', date: '2026-05-16', merchant: 'IRCTC', description: 'UPI/irctc@sbi · train ticket', amount: -1245, category: 'Transport', confidence: 0.9 },
  { id: 't20', date: '2026-05-18', merchant: 'Dunzo', description: 'UPI/dunzo@okhdfcbank', amount: -340, category: 'Food', confidence: 0.6 },
  { id: 't21', date: '2026-05-19', merchant: 'Myntra', description: 'UPI/myntra@ppl', amount: -2780, category: 'Shopping', confidence: 0.72 },
  { id: 't22', date: '2026-05-20', merchant: 'Bescom', description: 'Electricity · UPI/QR', amount: -1180, category: 'Utilities', confidence: 0.93 },
  { id: 't23', date: '2026-05-21', merchant: 'Zerodha', description: 'UPI/zerodha@ybl · investment', amount: -10000, category: 'Investments', confidence: 0.97 },
  { id: 't24', date: '2026-05-22', merchant: 'Starbucks India', description: 'UPI/starbucks@hdfcbank', amount: -385, category: 'Food', confidence: 0.94 },
  { id: 't25', date: '2026-05-23', merchant: 'PharmEasy', description: 'UPI/pharmeasy@axisbank', amount: -724, category: 'Healthcare', confidence: 0.9 },
  { id: 't26', date: '2026-05-24', merchant: 'Decathlon', description: 'POS purchase · card ••6021', amount: -3260, category: 'Shopping', confidence: 0.58 },
  { id: 't27', date: '2026-05-25', merchant: 'Freelance · Lumen Studio', description: 'NEFT · invoice #INV-214', amount: 18500, category: 'Income', confidence: 0.86 },
  { id: 't28', date: '2026-05-27', merchant: 'Tata Sky', description: 'DTH recharge · UPI/AUTOPAY', amount: -499, category: 'Utilities', confidence: 0.95 },
  { id: 't29', date: '2026-05-29', merchant: 'Groww', description: 'UPI/groww@ybl · SIP', amount: -5000, category: 'Investments', confidence: 0.98 },
  { id: 't30', date: '2026-05-30', merchant: 'Blinkit', description: 'UPI/blinkit@okaxis', amount: -892, category: 'Food', confidence: 0.91 },
];

/**
 * Detected statement summary. The believable headline numbers (127 txns,
 * 12 categories) describe the *whole* statement; the table renders the
 * normalized representative set above. A real parser would populate both
 * from the actual file.
 */
export const detectedSummary = {
  bankName: 'HDFC Bank',
  statementLabel: 'Detected HDFC Bank Statement',
  totalTransactions: 127,
  totalCategories: 12,
  totalInflow: 130500, // ₹1,30,500
  totalOutflow: -84250, // ₹84,250
};

export const recentImports: RecentImport[] = [
  { id: 'r1', fileName: 'HDFC_Statement_Apr_2026.pdf', fileType: 'PDF', importedOn: '12 days ago', transactionCount: 118, status: 'completed' },
  { id: 'r2', fileName: 'ICICI_Card_Q1_2026.xlsx', fileType: 'XLSX', importedOn: '3 weeks ago', transactionCount: 64, status: 'completed' },
  { id: 'r3', fileName: 'SBI_Savings_Feb_2026.csv', fileType: 'CSV', importedOn: '28 Feb', transactionCount: 92, status: 'completed' },
];
