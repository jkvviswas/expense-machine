import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';
import { loansStore } from '../loans/store';
import type { Category } from '../transactions/types';

export type CommitmentKind = 'Rent' | 'EMI' | 'Insurance' | 'Credit Card' | 'Subscription' | 'SIP' | 'Tuition' | 'Other';

export interface Commitment {
  id: string;
  name: string;
  kind: CommitmentKind;
  amount: number;
  dueDate: string; // ISO yyyy-mm-dd (next due)
  category: Category;
  /** When set, this commitment mirrors a loan EMI (read-only, auto-managed). */
  loanId?: string;
  /** ISO date this was last marked paid, if any. */
  lastPaidDate?: string;
}

export const COMMITMENT_KINDS: CommitmentKind[] = ['Rent', 'EMI', 'Insurance', 'Credit Card', 'Subscription', 'SIP', 'Tuition', 'Other'];

let user: Commitment[] = persist.read<Commitment[]>(STORAGE_KEYS.commitments, []) ?? [];
const listeners = new Set<() => void>();
const save = () => persist.write(STORAGE_KEYS.commitments, user);

/** Cached merged snapshot — rebuilt only when data changes, so the reference is
 *  stable across renders (required by useSyncExternalStore to avoid loops). */
let snapshot: Commitment[] = [];
function rebuild() {
  snapshot = [...user, ...loanCommitments()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
const emit = () => {
  rebuild();
  listeners.forEach((l) => l());
};

/** Loan EMIs surface as (virtual, read-only) commitments automatically. */
function loanCommitments(): Commitment[] {
  return loansStore.all()
    .filter((l) => l.emi > 0 && !l.closed && l.remaining > 0)
    .map((l) => ({
      id: `loan-emi-${l.id}`,
      name: `${l.name} — EMI`,
      kind: 'EMI' as CommitmentKind,
      amount: l.emi,
      dueDate: l.dueDate,
      category: 'Loans' as Category,
      loanId: l.id,
    }));
}

export const commitmentsStore = {
  /** All commitments: user-created + auto loan EMIs, sorted by due date. */
  all(): Commitment[] {
    return snapshot;
  },
  userOnly(): Commitment[] {
    return user;
  },
  add(c: Omit<Commitment, 'id'>): Commitment {
    const created: Commitment = { ...c, id: `cmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
    user = [created, ...user];
    save();
    emit();
    return created;
  },
  update(id: string, patch: Partial<Omit<Commitment, 'id'>>) {
    user = user.map((c) => (c.id === id ? { ...c, ...patch } : c));
    save();
    emit();
  },
  remove(id: string) {
    user = user.filter((c) => c.id !== id);
    save();
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

// Build the initial snapshot, and rebuild whenever loans change (registered
// ONCE at module load — not per subscriber — so there is no listener pile-up).
rebuild();
loansStore.subscribe(emit);

export function useCommitments(): Commitment[] {
  return useSyncExternalStore(commitmentsStore.subscribe, commitmentsStore.all, commitmentsStore.all);
}
