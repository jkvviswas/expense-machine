import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';
import { transactionsStore } from '../transactions/store';

export const LOAN_TYPES = [
  'Personal Loan',
  'Home Loan',
  'Vehicle Loan',
  'Education Loan',
  'Credit Line',
  'Business Loan',
  'Other',
] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export type LoanStatus = 'Active' | 'Principal Cleared' | 'Closed';

export interface Loan {
  id: string;
  name: string;
  loanType: LoanType;
  lenderName?: string;
  /** Original principal amount disbursed. */
  principal: number;
  interestRate: number; // annual %
  emi: number;
  /** Outstanding principal remaining today. */
  remaining: number;
  dueDate: string; // ISO yyyy-mm-dd — next EMI date
  /** ISO yyyy-mm-dd — when the loan started. */
  startDate?: string;
  /** Account the loan was disbursed into (used for the one-time credit, new loans only). */
  accountId?: string;
  /**
   * True for a loan that already existed before being tracked here (money
   * was received in the past — no disbursement transaction is created).
   * False/undefined for a brand-new loan being received now.
   */
  isExisting?: boolean;
  /** Manually-set "Closed" override, for fully settled loans. */
  closed?: boolean;
  /** ISO timestamp this loan record was created (for the timeline). */
  createdAt?: string;
}

export function loanStatus(l: Loan): LoanStatus {
  if (l.closed) return 'Closed';
  return l.remaining > 0 ? 'Active' : 'Principal Cleared';
}

let loans: Loan[] = (persist.read<Loan[]>(STORAGE_KEYS.loans, []) ?? []).map((l) => ({
  ...l,
  loanType: l.loanType ?? ('Other' as LoanType),
  createdAt: l.createdAt ?? new Date().toISOString(),
}));
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => persist.write(STORAGE_KEYS.loans, loans);

export const loansStore = {
  all(): Loan[] {
    return loans;
  },
  /**
   * Create a loan. If `loan.isExisting` is true (the loan already existed —
   * money was received in the past), NO income transaction is created, since
   * that would invent a fake inflow and corrupt Dashboard/Reports/Analytics/
   * Cashflow. Otherwise (a brand-new loan being received now) a one-time
   * "Loan Credit" income transaction for the original principal is recorded
   * in the single ledger.
   */
  add(loan: Omit<Loan, 'id'>): Loan {
    const created: Loan = { createdAt: new Date().toISOString(), ...loan, id: `loan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
    loans = [created, ...loans];
    save();
    if (!created.isExisting && created.principal > 0) {
      transactionsStore.add({
        date: created.startDate || new Date().toISOString().slice(0, 10),
        merchant: created.name,
        description: `${created.loanType} disbursement`,
        amount: Math.abs(created.principal),
        category: 'Loans',
        accountId: created.accountId || 'manual',
        paymentMethod: 'NEFT',
        notes: 'Loan credit — original principal received',
        confidence: 1,
        edited: true,
        loanId: created.id,
      });
    }
    emit();
    return created;
  },
  update(id: string, patch: Partial<Omit<Loan, 'id'>>) {
    loans = loans.map((l) => (l.id === id ? { ...l, ...patch } : l));
    save();
    emit();
  },
  /** "Mark Loan Closed" — only meaningful once Outstanding Principal = 0. */
  markClosed(id: string) {
    loans = loans.map((l) => (l.id === id ? { ...l, closed: true } : l));
    save();
    emit();
  },
  remove(id: string) {
    loans = loans.filter((l) => l.id !== id);
    save();
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useLoans(): Loan[] {
  return useSyncExternalStore(loansStore.subscribe, loansStore.all, () => loans);
}
