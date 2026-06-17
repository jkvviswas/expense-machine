import type { Transaction, Category } from '../transactions/types';
import {
  monthsInLedger,
  monthlyFlows,
  merchantInsights,
  categoryTrends,
  cashflowSummary,
  type Insight,
} from './derive';

/**
 * BEHAVIOUR LAYER (additive, presentation-only).
 * Computes "financial intelligence" metrics from the ledger. These are new,
 * standalone helpers — they do NOT modify any locked derivation function.
 */

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export interface BehaviourMetrics {
  avgTransactionSize: number;
  mostActiveMerchant: { merchant: string; count: number } | null;
  mostActiveCategory: { category: Category; count: number } | null;
  largestRecurring: { merchant: string; amount: number } | null;
  spendingFrequency: number; // expense txns per active day
  spendingVelocity: number; // avg expense per day this month
  savingsTrend: 'improving' | 'declining' | 'steady';
}

export function behaviourMetrics(txns: Transaction[]): BehaviourMetrics {
  const expenses = txns.filter((t) => t.amount < 0);
  const totalExpense = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const avgTransactionSize = expenses.length ? totalExpense / expenses.length : 0;

  // most active merchant by count
  const mCount = new Map<string, number>();
  for (const t of expenses) mCount.set(t.merchant, (mCount.get(t.merchant) ?? 0) + 1);
  let mostActiveMerchant: BehaviourMetrics['mostActiveMerchant'] = null;
  for (const [merchant, count] of mCount) {
    if (!mostActiveMerchant || count > mostActiveMerchant.count) mostActiveMerchant = { merchant, count };
  }

  // most active category by count
  const cCount = new Map<Category, number>();
  for (const t of expenses) cCount.set(t.category, (cCount.get(t.category) ?? 0) + 1);
  let mostActiveCategory: BehaviourMetrics['mostActiveCategory'] = null;
  for (const [category, count] of cCount) {
    if (!mostActiveCategory || count > mostActiveCategory.count) mostActiveCategory = { category, count };
  }

  // largest recurring: biggest auto-pay / recurring-flagged merchant
  const recurring = expenses.filter((t) => {
    const d = `${t.merchant} ${t.description}`.toLowerCase();
    return t.paymentMethod === 'Auto-pay' || /sip|rent|premium|subscription|recharge|broadband|annual|monthly/.test(d);
  });
  let largestRecurring: BehaviourMetrics['largestRecurring'] = null;
  for (const t of recurring) {
    const amt = Math.abs(t.amount);
    if (!largestRecurring || amt > largestRecurring.amount) largestRecurring = { merchant: t.merchant, amount: amt };
  }

  // frequency + velocity within the most recent month
  const months = monthsInLedger(txns);
  const currentKey = months.length ? months[months.length - 1].key : null;
  const monthExpenses = currentKey ? expenses.filter((t) => monthKeyOf(t.date) === currentKey) : [];
  const activeDays = new Set(monthExpenses.map((t) => t.date)).size || 1;
  const monthSpend = monthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const spendingFrequency = monthExpenses.length / activeDays;
  const spendingVelocity = monthSpend / activeDays;

  // savings trend across last two months
  const flows = monthlyFlows(txns);
  let savingsTrend: BehaviourMetrics['savingsTrend'] = 'steady';
  if (flows.length >= 2) {
    const cur = flows[flows.length - 1].net;
    const prev = flows[flows.length - 2].net;
    savingsTrend = cur > prev * 1.05 ? 'improving' : cur < prev * 0.95 ? 'declining' : 'steady';
  }

  return {
    avgTransactionSize,
    mostActiveMerchant,
    mostActiveCategory,
    largestRecurring,
    spendingFrequency,
    spendingVelocity,
    savingsTrend,
  };
}

/**
 * NATURAL-LANGUAGE INSIGHTS (presentation-only).
 * Produces warmer, more human observations than the raw rule output. Reads the
 * same derived numbers; does not change generateInsights(). Avoids robotic
 * phrasings like "Uncategorized activity down 100%".
 */
export function naturalInsights(txns: Transaction[]): Insight[] {
  const out: Insight[] = [];
  const months = monthsInLedger(txns);
  const hasPrev = months.length > 1;
  const trends = categoryTrends(txns).filter((t) => t.category !== 'Uncategorized');
  const currentKey = months.length ? months[months.length - 1].key : undefined;
  const cf = cashflowSummary(txns, currentKey);

  // Savings framing
  if (cf.inflow > 0) {
    const rate = Math.round((cf.net / cf.inflow) * 100);
    if (rate >= 40) {
      out.push({ id: 'save', tone: 'gain', text: `You kept ${rate}% of what you earned this month — a strong savings month.` });
    } else if (rate >= 0) {
      out.push({ id: 'save', tone: 'neutral', text: `You saved ${rate}% of your income this month.` });
    } else {
      out.push({ id: 'save', tone: 'loss', text: `You spent more than you earned this month, drawing down savings by ${Math.abs(rate)}%.` });
    }
  }

  // Biggest riser (meaningful only with prior month + real prior spend)
  const riser = trends.find((t) => t.direction === 'up' && t.changePct != null && t.previous > 0 && (t.changePct ?? 0) >= 10);
  if (hasPrev && riser && riser.changePct != null) {
    out.push({
      id: 'riser',
      tone: 'loss',
      text: `${riser.category} is your fastest-growing category, up about ${Math.round(riser.changePct)}% from last month.`,
    });
  }

  // Notable easing
  const easer = trends.find((t) => t.direction === 'down' && t.changePct != null && t.previous > 0 && (t.changePct ?? 0) <= -10);
  if (hasPrev && easer && easer.changePct != null) {
    out.push({
      id: 'easer',
      tone: 'gain',
      text: `You eased off ${easer.category.toLowerCase()} this month, spending roughly ${Math.abs(Math.round(easer.changePct))}% less than last.`,
    });
  }

  // Merchant habit
  const merchants = merchantInsights(txns, 1);
  if (merchants.length) {
    const m = merchants[0];
    out.push({
      id: 'habit',
      tone: 'neutral',
      text: `${m.merchant} is where the most flows out — ₹${m.total.toLocaleString('en-IN')} across ${m.count} ${m.count === 1 ? 'payment' : 'payments'}.`,
    });
  }

  // Behaviour colour
  const b = behaviourMetrics(txns);
  if (b.avgTransactionSize > 0) {
    out.push({
      id: 'avg',
      tone: 'neutral',
      text: `Your typical transaction is about ₹${Math.round(b.avgTransactionSize).toLocaleString('en-IN')}.`,
    });
  }

  return out;
}
