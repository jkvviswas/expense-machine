import { categoryBudgets } from '../budgets/derive';
import { budgetStore } from '../budgets/store';
import { transactionsStore } from '../transactions/store';
import { formatMoneyFull } from '../import/format';
import { notificationsStore, type AppNotification } from './store';

/**
 * ============================================================================
 *  ALERT ENGINE  (presentation-layer, additive)
 * ============================================================================
 *
 * Derives notifications from the current ledger + budget caps and pushes them
 * into the notifications store. It REUSES the locked `categoryBudgets`
 * derivation (read-only) for budget status, so alert thresholds reconcile
 * exactly with the Budgets page — no duplicated math, no locked file touched.
 *
 * Alert types:
 *   - Budget over   → an `alert` notification per over-budget category.
 *   - Budget watch  → a `watch` notification per near-limit category.
 *   - Large expense → flags the single largest outflow in the latest month.
 *
 * Notification ids are deterministic (derived from the underlying fact) so the
 * same condition doesn't spam duplicates across reloads — the store's read /
 * dismissed sets key off these stable ids.
 */

const LARGE_EXPENSE_FLOOR = 5000; // ₹ — only flag genuinely notable outflows.

export function runAlertEngine(): void {
  const txns = transactionsStore.get();
  if (txns.length === 0) {
    notificationsStore.setGenerated([]);
    return;
  }

  const now = new Date().toISOString();
  const out: AppNotification[] = [];

  // --- Budget alerts (reuse locked derivation) ---
  const budgets = categoryBudgets(txns, budgetStore.getCaps());
  for (const b of budgets) {
    if (b.status === 'over') {
      out.push({
        id: `budget-over-${b.category}`,
        kind: 'budget',
        tone: 'alert',
        title: `${b.category} budget exceeded`,
        body: `You've spent ${formatMoneyFull(b.spent)} of your ${formatMoneyFull(b.cap)} ${b.category} budget — ${formatMoneyFull(Math.abs(b.remaining))} over.`,
        at: now,
        read: false,
      });
    } else if (b.status === 'watch') {
      out.push({
        id: `budget-watch-${b.category}`,
        kind: 'budget',
        tone: 'watch',
        title: `${b.category} budget approaching`,
        body: `${formatMoneyFull(b.spent)} of ${formatMoneyFull(b.cap)} used. ${formatMoneyFull(b.remaining)} remaining this month.`,
        at: now,
        read: false,
      });
    }
  }

  // --- Large-expense flag (latest month) ---
  const months = [...new Set(txns.map((t) => t.date.slice(0, 7)))].sort();
  const latestMonth = months[months.length - 1];
  const monthExpenses = txns.filter(
    (t) => t.date.slice(0, 7) === latestMonth && t.amount < 0,
  );
  if (monthExpenses.length > 0) {
    const largest = monthExpenses.reduce((a, b) => (a.amount <= b.amount ? a : b));
    if (Math.abs(largest.amount) >= LARGE_EXPENSE_FLOOR) {
      out.push({
        id: `large-expense-${largest.id}`,
        kind: 'expense',
        tone: 'info',
        title: 'Large expense this month',
        body: `${largest.merchant} — ${formatMoneyFull(largest.amount)} on ${largest.date}.`,
        at: now,
        read: false,
      });
    }
  }

  notificationsStore.setGenerated(out);
}
