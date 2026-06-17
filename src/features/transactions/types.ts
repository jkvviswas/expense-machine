import type { Category } from '../import/types';

export type { Category };
export { CATEGORIES } from '../import/types';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod =
  | 'UPI'
  | 'Debit Card'
  | 'Credit Card'
  | 'NEFT'
  | 'Net Banking'
  | 'Auto-pay'
  | 'Cash';

/** A ledger account the user holds. */
export interface Account {
  id: string;
  /** Display label, e.g. "HDFC Savings". */
  label: string;
  /** Masked number, e.g. ••6021. */
  mask: string;
}

/**
 * A ledger transaction. Extends the shared parsed shape with the fields the
 * central ledger needs (account, payment method, notes). `confidence` carries
 * over from import so the detail drawer can show how a category was assigned.
 */
export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  description: string;
  amount: number; // positive = income, negative = expense
  category: Category;
  accountId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  /** 0–1 category confidence from import; undefined for manually-added. */
  confidence?: number;
  /** Whether the category was manually set. */
  edited?: boolean;
  /** Typed statement metadata, extracted at import (Phase 1) — kept as first-
   *  class fields rather than buried in `description`. All optional. */
  referenceNo?: string;
  transactionId?: string;
  upiRef?: string;
  runningBalance?: number;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  maskedAccount?: string;
  ifsc?: string;
  narration?: string;
  /** Set when this transaction is the loan-disbursement credit or an EMI
   *  payment linked to a loan. */
  loanId?: string;
  /** True for system-created entries (e.g. statement opening balance). These
   *  flow through the same ledger but are protected from accidental editing. */
  isSystemGenerated?: boolean;
}

export function txnType(t: Transaction): TransactionType {
  return t.amount >= 0 ? 'income' : 'expense';
}

/** Filter state shape used by the Transactions page. */
export interface FilterState {
  query: string;
  category: Category | 'all';
  accountId: string | 'all';
  type: TransactionType | 'all';
  /** Named date window; 'all' means no date bound. */
  dateWindow: 'all' | 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
  /** ISO yyyy-mm-dd bounds, used only when dateWindow === 'custom'. */
  customFrom?: string;
  customTo?: string;
  /** Sort order for the list. */
  sort: 'newest' | 'oldest' | 'amountDesc' | 'amountAsc';
}

export const emptyFilters: FilterState = {
  query: '',
  category: 'all',
  accountId: 'all',
  type: 'all',
  dateWindow: 'all',
  sort: 'newest',
};
