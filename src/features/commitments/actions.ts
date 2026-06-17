import { transactionsStore } from '../transactions/store';
import { commitmentsStore, type Commitment } from './store';
import { loansStore } from '../loans/store';
import { successToastStore } from '../transactions/successToast';
import { formatMoneyFull, formatDate } from '../import/format';

/** Advance an ISO date by one calendar month. */
function nextMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function markCommitmentPaid(c: Commitment, accountId?: string) {
  const today = new Date().toISOString().slice(0, 10);

  transactionsStore.add({
    date: today,
    merchant: c.name,
    description: c.loanId ? 'Loan EMI payment' : `${c.kind} payment`,
    amount: -Math.abs(c.amount),
    category: c.loanId ? 'Loans' : c.category,
    accountId: accountId || 'manual',
    paymentMethod: 'Auto-pay',
    notes: 'Commitment payment',
    confidence: 1,
    edited: true,
    ...(c.loanId ? { loanId: c.loanId } : {}),
  });

  const nextDue = nextMonth(c.dueDate);

  if (c.loanId) {
    const loan = loansStore.all().find((l) => l.id === c.loanId);
    if (loan) {
      const prevRemaining = loan.remaining;
      const newRemaining = Math.max(0, loan.remaining - c.amount);
      loansStore.update(loan.id, {
        remaining: newRemaining,
        dueDate: nextMonth(loan.dueDate),
      });
      successToastStore.show(
        `EMI Paid — ${c.name}`,
        [
          `${formatMoneyFull(c.amount)} recorded to ledger.`,
          `Principal: ${formatMoneyFull(prevRemaining)} → ${formatMoneyFull(newRemaining)}`,
          `Next EMI: ${formatDate(nextDue)}`,
        ],
      );
    }
  } else {
    commitmentsStore.update(c.id, { lastPaidDate: today, dueDate: nextDue });
    successToastStore.show(
      `Commitment Paid — ${c.name}`,
      [
        `${formatMoneyFull(c.amount)} recorded to ledger.`,
        `Next due: ${formatDate(nextDue)}`,
      ],
    );
  }
}
