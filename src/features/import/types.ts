/**
 * Import Center — domain types.
 * The signature feature of Expense Machine: turn a raw statement into
 * organized, categorized money.
 */

export type Category =
  | 'Food'
  | 'Groceries'
  | 'Transport'
  | 'Fuel'
  | 'Shopping'
  | 'Utilities'
  | 'Bills'
  | 'Rent'
  | 'Entertainment'
  | 'Healthcare'
  | 'Medical'
  | 'Education'
  | 'Travel'
  | 'Insurance'
  | 'Tax'
  | 'Salary'
  | 'Freelance'
  | 'Income'
  | 'Investments'
  | 'Loans'
  | 'Uncategorized'
  | 'Others';

export const CATEGORIES: Category[] = [
  'Food',
  'Groceries',
  'Transport',
  'Fuel',
  'Shopping',
  'Utilities',
  'Bills',
  'Rent',
  'Entertainment',
  'Healthcare',
  'Medical',
  'Education',
  'Travel',
  'Insurance',
  'Tax',
  'Salary',
  'Freelance',
  'Income',
  'Investments',
  'Loans',
  'Uncategorized',
  'Others',
];

export type FlowStep =
  | 'upload'
  | 'processing'
  | 'extraction'
  | 'review'
  | 'complete';

export interface ParsedTransaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  description: string;
  amount: number; // positive = inflow, negative = outflow
  category: Category;
  /** Model confidence in the suggested category, 0–1. */
  confidence: number;
  /** Whether the user has manually overridden the suggested category. */
  edited?: boolean;
  /** Typed statement metadata extracted during parsing (Phase 1). Optional. */
  referenceNo?: string;
  transactionId?: string;
  upiRef?: string;
  runningBalance?: number;
  narration?: string;
  /** Masked card/account number found in the narration, e.g. XXXX1234. */
  maskedAccount?: string;
  ifsc?: string;
}

export interface StatementMeta {
  fileName: string;
  fileType: 'PDF' | 'CSV' | 'XLSX';
  fileSizeLabel: string;
  accountName: string;
  accountMask: string; // e.g. ••4291
  dateRangeStart: string;
  dateRangeEnd: string;
  /** Best-effort, additive — extracted from statement pre-amble if present. */
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  /** Opening/closing balance from the statement summary, when detectable. */
  openingBalance?: number;
  closingBalance?: number;
}

export interface RecentImport {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'CSV' | 'XLSX';
  importedOn: string; // human label
  transactionCount: number;
  status: 'completed' | 'processing' | 'failed';
  /** Detected bank name, if available. */
  bankName?: string;
}
