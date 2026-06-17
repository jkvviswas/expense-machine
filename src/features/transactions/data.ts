import type { Account, Transaction } from './types';

/**
 * The ledger data layer. Today it serves a realistic in-memory Indian ledger.
 * It is shaped like a future backend: `fetchTransactions()` / `fetchAccounts()`
 * are async, so swapping to Supabase later is a one-file change and the UI
 * (which already handles a loading state) does not change.
 */

export const accounts: Account[] = [
  { id: 'hdfc', label: 'HDFC Savings', mask: '••6021' },
  { id: 'icici', label: 'ICICI Salary', mask: '••8843' },
  { id: 'sbi', label: 'SBI Joint', mask: '••2190' },
  { id: 'hdfc-cc', label: 'HDFC Credit Card', mask: '••4417' },
];

export const accountById = (id: string): Account | undefined =>
  accounts.find((a) => a.id === id);

/** A realistic multi-account Indian ledger for May–June 2026. */
const ledger: Transaction[] = [
  { id: 'x01', date: '2026-06-02', merchant: 'Swiggy', description: 'UPI/swiggy@axisbank', amount: -486, category: 'Food', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.95 },
  { id: 'x02', date: '2026-06-02', merchant: 'Rapido', description: 'UPI/rapido.qr@ybl', amount: -78, category: 'Transport', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.93 },
  { id: 'x03', date: '2026-06-01', merchant: 'Acme Software Pvt Ltd', description: 'NEFT · SALARY JUN 2026', amount: 118000, category: 'Income', accountId: 'icici', paymentMethod: 'NEFT', confidence: 0.99, notes: 'Monthly salary credit' },
  { id: 'x04', date: '2026-06-01', merchant: 'Tata Power', description: 'Electricity · UPI/AUTOPAY', amount: -2460, category: 'Utilities', accountId: 'hdfc', paymentMethod: 'Auto-pay', confidence: 0.97 },
  { id: 'x05', date: '2026-05-31', merchant: 'Amazon India', description: 'UPI/amazonpay@apl', amount: -2899, category: 'Shopping', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.68 },
  { id: 'x06', date: '2026-05-30', merchant: 'Zomato', description: 'UPI/zomato@paytm', amount: -642, category: 'Food', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.95 },
  { id: 'x07', date: '2026-05-30', merchant: 'Jio Fiber', description: 'Broadband · UPI/AUTOPAY', amount: -999, category: 'Utilities', accountId: 'hdfc', paymentMethod: 'Auto-pay', confidence: 0.97 },
  { id: 'x08', date: '2026-05-29', merchant: 'Groww', description: 'UPI/groww@ybl · SIP', amount: -5000, category: 'Investments', accountId: 'icici', paymentMethod: 'UPI', confidence: 0.98, notes: 'Monthly index SIP' },
  { id: 'x09', date: '2026-05-28', merchant: 'BigBasket', description: 'UPI/bigbasket@hdfcbank', amount: -1742, category: 'Food', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.94 },
  { id: 'x10', date: '2026-05-28', merchant: 'Airtel', description: 'Postpaid · UPI/AUTOPAY', amount: -799, category: 'Utilities', accountId: 'hdfc', paymentMethod: 'Auto-pay', confidence: 0.96 },
  { id: 'x11', date: '2026-05-27', merchant: 'BookMyShow', description: 'UPI/bookmyshow@icici', amount: -880, category: 'Entertainment', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.94 },
  { id: 'x12', date: '2026-05-26', merchant: 'Uber', description: 'UPI/uberindia@axisbank', amount: -312, category: 'Transport', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.92 },
  { id: 'x13', date: '2026-05-25', merchant: 'Freelance · Lumen Studio', description: 'NEFT · invoice #INV-218', amount: 22000, category: 'Income', accountId: 'icici', paymentMethod: 'NEFT', confidence: 0.86, notes: 'Design retainer' },
  { id: 'x14', date: '2026-05-24', merchant: 'Apollo Pharmacy', description: 'UPI/apollo247@ybl', amount: -534, category: 'Healthcare', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.91 },
  { id: 'x15', date: '2026-05-23', merchant: 'Netflix India', description: 'UPI/AUTOPAY · monthly', amount: -649, category: 'Entertainment', accountId: 'hdfc', paymentMethod: 'Auto-pay', confidence: 0.96 },
  { id: 'x16', date: '2026-05-22', merchant: 'Flipkart', description: 'UPI/flipkart@axisbank', amount: -4299, category: 'Shopping', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.61 },
  { id: 'x17', date: '2026-05-21', merchant: 'Indian Oil', description: 'Fuel · Debit Card ••6021', amount: -2000, category: 'Transport', accountId: 'hdfc', paymentMethod: 'Debit Card', confidence: 0.88 },
  { id: 'x18', date: '2026-05-20', merchant: 'Zerodha', description: 'UPI/zerodha@ybl · equity', amount: -15000, category: 'Investments', accountId: 'icici', paymentMethod: 'UPI', confidence: 0.97 },
  { id: 'x19', date: '2026-05-19', merchant: 'Starbucks India', description: 'UPI/starbucks@hdfcbank', amount: -415, category: 'Food', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.94 },
  { id: 'x20', date: '2026-05-18', merchant: 'PharmEasy', description: 'UPI/pharmeasy@axisbank', amount: -689, category: 'Healthcare', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.9 },
  { id: 'x21', date: '2026-05-17', merchant: 'Myntra', description: 'UPI/myntra@ppl', amount: -2240, category: 'Shopping', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.72 },
  { id: 'x22', date: '2026-05-16', merchant: 'IRCTC', description: 'UPI/irctc@sbi · train ticket', amount: -1485, category: 'Transport', accountId: 'sbi', paymentMethod: 'UPI', confidence: 0.9, notes: 'Chennai–Bengaluru' },
  { id: 'x23', date: '2026-05-15', merchant: 'Cult.fit', description: 'UPI/cultfit@icici', amount: -1499, category: 'Healthcare', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.85 },
  { id: 'x24', date: '2026-05-14', merchant: 'Spotify', description: 'UPI/AUTOPAY · Premium', amount: -119, category: 'Entertainment', accountId: 'hdfc', paymentMethod: 'Auto-pay', confidence: 0.95 },
  { id: 'x25', date: '2026-05-13', merchant: 'Bescom', description: 'Electricity · UPI/QR', amount: -1180, category: 'Utilities', accountId: 'sbi', paymentMethod: 'UPI', confidence: 0.93 },
  { id: 'x26', date: '2026-05-12', merchant: 'Blinkit', description: 'UPI/blinkit@okaxis', amount: -928, category: 'Food', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.91 },
  { id: 'x27', date: '2026-05-11', merchant: 'PhonePe', description: 'UPI/p2p · to Rohan S', amount: -1500, category: 'Uncategorized', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.45, notes: 'Split dinner' },
  { id: 'x28', date: '2026-05-10', merchant: 'Decathlon', description: 'POS · Debit Card ••6021', amount: -3260, category: 'Shopping', accountId: 'hdfc', paymentMethod: 'Debit Card', confidence: 0.58 },
  { id: 'x29', date: '2026-05-09', merchant: 'Tata Sky', description: 'DTH recharge · UPI/AUTOPAY', amount: -499, category: 'Utilities', accountId: 'hdfc', paymentMethod: 'Auto-pay', confidence: 0.95 },
  { id: 'x30', date: '2026-05-08', merchant: 'Reliance Fresh', description: 'POS · Debit Card ••6021', amount: -1620, category: 'Food', accountId: 'hdfc', paymentMethod: 'Debit Card', confidence: 0.9 },
  { id: 'x31', date: '2026-05-07', merchant: 'Google Pay', description: 'UPI/p2p · from Anjali M', amount: 2500, category: 'Income', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.5, notes: 'Shared rent reimbursement' },
  { id: 'x32', date: '2026-05-06', merchant: 'Paytm', description: 'UPI · mobile recharge', amount: -299, category: 'Utilities', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.8 },
  { id: 'x33', date: '2026-05-05', merchant: 'Croma', description: 'POS · Credit Card ••4417', amount: -7990, category: 'Shopping', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.66, notes: 'Headphones' },
  { id: 'x34', date: '2026-05-04', merchant: 'Dunzo', description: 'UPI/dunzo@okhdfcbank', amount: -360, category: 'Food', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.6 },
  { id: 'x35', date: '2026-05-03', merchant: 'HDFC Bank', description: 'Credit card bill payment', amount: -18500, category: 'Uncategorized', accountId: 'hdfc', paymentMethod: 'Net Banking', confidence: 0.4, notes: 'CC statement settle' },
  { id: 'x36', date: '2026-05-02', merchant: 'LIC Premium', description: 'NEFT · policy 8841', amount: -6200, category: 'Healthcare', accountId: 'icici', paymentMethod: 'NEFT', confidence: 0.82 },
  { id: 'x37', date: '2026-05-02', merchant: 'Ola', description: 'UPI/olacabs@ybl', amount: -198, category: 'Transport', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.9 },
  { id: 'x38', date: '2026-05-01', merchant: 'Swiggy Instamart', description: 'UPI/swiggy@axisbank', amount: -742, category: 'Food', accountId: 'hdfc', paymentMethod: 'UPI', confidence: 0.93 },
  { id: 'x39', date: '2026-05-01', merchant: 'Amazon Prime', description: 'UPI/AUTOPAY · annual', amount: -1499, category: 'Entertainment', accountId: 'hdfc-cc', paymentMethod: 'Credit Card', confidence: 0.94 },
  { id: 'x40', date: '2026-05-01', merchant: 'Rent · Landlord', description: 'NEFT · monthly rent', amount: -28000, category: 'Utilities', accountId: 'hdfc', paymentMethod: 'NEFT', confidence: 0.7, notes: '2BHK Indiranagar' },
];

const LATENCY_MS = 450;

/** Async fetch — mirrors a future backend call. */
export async function fetchTransactions(): Promise<Transaction[]> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  return ledger.map((t) => ({ ...t }));
}

export async function fetchAccounts(): Promise<Account[]> {
  return accounts;
}
