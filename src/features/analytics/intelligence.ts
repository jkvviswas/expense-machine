import type { Transaction, Category } from '../transactions/types';
import {
  monthsInLedger,
  cashflowSummary,
  categoryTrends,
  merchantInsights,
  type CategoryTrend,
} from './derive';
import { behaviourMetrics } from './behaviour';
import { budgetStore } from '../budgets/store';
import { categoryBudgets } from '../budgets/derive';
import { buildHistory } from './history';
import { monthKeyOf } from '../../lib/date';
import { formatIndianNumber } from '../../lib/money';

/**
 * ANALYTICS INTELLIGENCE (presentation-only, additive).
 * Pure functions computing the V4 "Financial Intelligence Center" views from
 * the ledger. None of this feeds locked systems.
 */

const REF = new Date();

function currentMonthKey(txns: Transaction[]): string {
  const m = monthsInLedger(txns);
  return m.length ? m[m.length - 1].key : '2026-06';
}

/* ---------------- Section 1: Financial Health Score ---------------- */
export interface HealthScore {
  score: number; // 0-100
  label: string;
  components: { label: string; value: number; weight: number }[];
  trend: 'up' | 'down' | 'flat';
}

/** Herfindahl-style concentration: 0 (diverse) .. 1 (one category). */
function concentration(shares: number[]): number {
  return shares.reduce((s, x) => s + x * x, 0);
}

export function financialHealthScore(txns: Transaction[]): HealthScore {
  const key = currentMonthKey(txns);
  const cf = cashflowSummary(txns, key);

  // 1. savings rate (cap at 50% → full marks)
  const savingsRate = cf.inflow > 0 ? cf.net / cf.inflow : 0;
  const savingsScore = Math.max(0, Math.min(1, savingsRate / 0.5));

  // 2. budget discipline: share of categories within cap
  const budgets = categoryBudgets(txns, budgetStore.getCaps());
  const within = budgets.filter((b) => b.status !== 'over').length;
  const disciplineScore = budgets.length ? within / budgets.length : 1;

  // 3. spending concentration (lower is healthier)
  const spend = new Map<Category, number>();
  let total = 0;
  for (const t of txns) {
    if (monthKeyOf(t.date) !== key || t.amount >= 0) continue;
    spend.set(t.category, (spend.get(t.category) ?? 0) + Math.abs(t.amount));
    total += Math.abs(t.amount);
  }
  const shares = total > 0 ? [...spend.values()].map((v) => v / total) : [1];
  const conc = concentration(shares); // 0..1
  const concentrationScore = 1 - Math.min(1, (conc - 0.2) / 0.8); // 0.2 ideal floor

  // 4. category diversification: how many categories active vs available
  const activeCats = spend.size;
  const diversificationScore = Math.min(1, activeCats / 6);

  const components = [
    { label: 'Savings rate', value: savingsScore, weight: 0.35 },
    { label: 'Budget discipline', value: disciplineScore, weight: 0.3 },
    { label: 'Spending balance', value: concentrationScore, weight: 0.2 },
    { label: 'Diversification', value: diversificationScore, weight: 0.15 },
  ];
  const score = Math.round(components.reduce((s, c) => s + c.value * c.weight, 0) * 100);

  const label =
    score >= 85 ? 'Excellent financial health'
      : score >= 70 ? 'Strong financial health'
        : score >= 55 ? 'Steady financial health'
          : score >= 40 ? 'Watchful financial health'
            : 'Strained financial health';

  // trend vs simulated prior month (presentation only)
  const hist = buildHistory(txns);
  let trend: HealthScore['trend'] = 'flat';
  if (hist.length >= 2) {
    const cur = hist[hist.length - 1];
    const prev = hist[hist.length - 2];
    const curRate = cur.inflow > 0 ? cur.net / cur.inflow : 0;
    const prevRate = prev.inflow > 0 ? prev.net / prev.inflow : 0;
    trend = curRate > prevRate * 1.03 ? 'up' : curRate < prevRate * 0.97 ? 'down' : 'flat';
  }

  return { score, label, components, trend };
}

/* ---------------- Section 2: Behaviour signals ---------------- */
export interface BehaviourSignal {
  title: string;
  observation: string;
  impact: 'high' | 'medium' | 'low';
  tone: 'gain' | 'loss' | 'neutral';
}

export function behaviourSignals(txns: Transaction[]): BehaviourSignal[] {
  const out: BehaviourSignal[] = [];
  const key = currentMonthKey(txns);
  const b = behaviourMetrics(txns);
  const cf = cashflowSummary(txns, key);
  const trends = categoryTrends(txns).filter((t) => t.category !== 'Uncategorized');

  // weekend vs weekday
  let weekend = 0, weekday = 0;
  for (const t of txns) {
    if (monthKeyOf(t.date) !== key || t.amount >= 0) continue;
    const day = new Date(t.date + 'T00:00:00').getDay();
    if (day === 0 || day === 6) weekend += Math.abs(t.amount);
    else weekday += Math.abs(t.amount);
  }
  if (weekend + weekday > 0) {
    const ws = weekend / (weekend + weekday);
    if (ws > 0.4)
      out.push({ title: 'Weekend spender', observation: `${Math.round(ws * 100)}% of spend lands on weekends.`, impact: 'medium', tone: 'neutral' });
    else
      out.push({ title: 'Weekday-led spending', observation: `Most spending happens on weekdays — only ${Math.round(ws * 100)}% on weekends.`, impact: 'low', tone: 'neutral' });
  }

  // dominant category
  const top = trends[0];
  if (top) {
    const key2 = currentMonthKey(txns);
    const cfTotal = cashflowSummary(txns, key2).outflow || 1;
    const share = Math.round((top.current / cfTotal) * 100);
    if (share >= 50)
      out.push({ title: `${top.category}-heavy month`, observation: `${top.category} alone is ${share}% of this month's spending.`, impact: 'high', tone: 'loss' });
  }

  // savings strength
  if (cf.inflow > 0) {
    const rate = Math.round((cf.net / cf.inflow) * 100);
    if (rate >= 40)
      out.push({ title: 'Savings improving', observation: `You retained ${rate}% of income — a strong month.`, impact: 'high', tone: 'gain' });
  }

  // declining category
  const easer = trends.find((t) => t.direction === 'down' && t.previous > 0 && (t.changePct ?? 0) <= -10);
  if (easer)
    out.push({ title: `${easer.category} declining`, observation: `${easer.category} fell ${Math.abs(Math.round(easer.changePct ?? 0))}% vs last month.`, impact: 'medium', tone: 'gain' });

  // low transport dependency
  const transport = trends.find((t) => t.category === 'Transport');
  if (transport && cf.outflow > 0 && transport.current / cf.outflow < 0.1)
    out.push({ title: 'Low transport dependency', observation: `Transport is under 10% of spending this month.`, impact: 'low', tone: 'gain' });

  // recurring load
  if (b.largestRecurring)
    out.push({ title: 'Recurring commitment', observation: `${b.largestRecurring.merchant} is your largest recurring outflow at \u20B9${formatIndianNumber(b.largestRecurring.amount)}.`, impact: 'medium', tone: 'neutral' });

  return out.slice(0, 6);
}

/* ---------------- Section 3: Category intelligence ---------------- */
export interface CategoryIntel extends CategoryTrend {
  share: number;
  rank: number;
}

export function categoryIntelligence(txns: Transaction[]): CategoryIntel[] {
  const trends = categoryTrends(txns).filter((t) => t.category !== 'Uncategorized');
  const total = trends.reduce((s, t) => s + t.current, 0) || 1;
  return trends.map((t, i) => ({ ...t, share: t.current / total, rank: i + 1 }));
}

/* ---------------- Section 4: Monthly comparison cards ---------------- */
export interface ComparisonCard {
  label: string;
  previous: number;
  current: number;
  diff: number;
  pct: number | null;
  goodWhenUp: boolean;
}

export function comparisonCards(txns: Transaction[]): { cards: ComparisonCard[]; simulated: boolean } {
  const hist = buildHistory(txns);
  if (hist.length < 2) return { cards: [], simulated: false };
  const cur = hist[hist.length - 1];
  const prev = hist[hist.length - 2];
  const pct = (c: number, p: number) => (p === 0 ? null : ((c - p) / Math.abs(p)) * 100);
  const cards: ComparisonCard[] = [
    { label: 'Income', previous: prev.inflow, current: cur.inflow, diff: cur.inflow - prev.inflow, pct: pct(cur.inflow, prev.inflow), goodWhenUp: true },
    { label: 'Spending', previous: prev.outflow, current: cur.outflow, diff: cur.outflow - prev.outflow, pct: pct(cur.outflow, prev.outflow), goodWhenUp: false },
    { label: 'Net savings', previous: prev.net, current: cur.net, diff: cur.net - prev.net, pct: pct(cur.net, prev.net), goodWhenUp: true },
  ];
  return { cards, simulated: cur.simulated || prev.simulated };
}

/* ---------------- Section 5: Weekly timeline ---------------- */
export interface WeekBucket {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export function weeklyTimeline(txns: Transaction[]): WeekBucket[] {
  const key = currentMonthKey(txns);
  const weeks: WeekBucket[] = [1, 2, 3, 4].map((w) => ({ label: `Week ${w}`, inflow: 0, outflow: 0, net: 0 }));
  for (const t of txns) {
    if (monthKeyOf(t.date) !== key) continue;
    const day = new Date(t.date + 'T00:00:00').getDate();
    const idx = Math.min(3, Math.floor((day - 1) / 7));
    if (t.amount >= 0) weeks[idx].inflow += t.amount;
    else weeks[idx].outflow += Math.abs(t.amount);
  }
  weeks.forEach((w) => (w.net = w.inflow - w.outflow));
  return weeks;
}

/* ---------------- Section 6: Merchant intelligence ---------------- */
export interface MerchantIntel {
  mostExpensive: { merchant: string; total: number }[];
  mostFrequent: { merchant: string; count: number }[];
  largestRecurring: { merchant: string; amount: number } | null;
  concentration: number; // share top-3 of all merchant spend
  riskMerchant: { merchant: string; total: number; share: number } | null;
}

export function merchantIntelligence(txns: Transaction[]): MerchantIntel {
  const all = merchantInsights(txns, 50);
  const totalSpend = all.reduce((s, m) => s + m.total, 0) || 1;
  const mostExpensive = [...all].sort((a, b) => b.total - a.total).slice(0, 5).map((m) => ({ merchant: m.merchant, total: m.total }));
  const mostFrequent = [...all].sort((a, b) => b.count - a.count).slice(0, 5).map((m) => ({ merchant: m.merchant, count: m.count }));
  const b = behaviourMetrics(txns);
  const top3 = mostExpensive.slice(0, 3).reduce((s, m) => s + m.total, 0);
  const concentrationShare = top3 / totalSpend;
  const topM = mostExpensive[0];
  const riskMerchant = topM && topM.total / totalSpend > 0.25
    ? { merchant: topM.merchant, total: topM.total, share: topM.total / totalSpend }
    : null;
  return {
    mostExpensive,
    mostFrequent,
    largestRecurring: b.largestRecurring,
    concentration: concentrationShare,
    riskMerchant,
  };
}

/* ---------------- Section 7: Prediction engine ---------------- */
export interface Prediction {
  text: string;
  tone: 'gain' | 'loss' | 'neutral';
}

export function lookingAhead(txns: Transaction[]): Prediction[] {
  const key = currentMonthKey(txns);
  const cf = cashflowSummary(txns, key);
  const out: Prediction[] = [];

  // days elapsed in reference month
  const elapsed = REF.getDate();
  const daysInMonth = new Date(REF.getFullYear(), REF.getMonth() + 1, 0).getDate();
  const fraction = Math.max(elapsed / daysInMonth, 0.1);

  const projSpend = Math.round(cf.outflow / fraction);
  const projNet = Math.round((cf.inflow - projSpend));

  out.push({ text: `If spending continues at the current pace, the month may close near \u20B9${formatIndianNumber(projSpend)} in outflow.`, tone: 'neutral' });
  out.push({ text: projNet >= 0 ? `Projected savings this month: about \u20B9${formatIndianNumber(projNet)}.` : `At this pace, spending could exceed income by about \u20B9${formatIndianNumber(Math.abs(projNet))}.`, tone: projNet >= 0 ? 'gain' : 'loss' });

  const budgets = categoryBudgets(txns, budgetStore.getCaps());
  const projectedOver = budgets.filter((b) => (b.spent / fraction) > b.cap && b.cap > 0);
  if (projectedOver.length === 0)
    out.push({ text: 'Budget overruns look unlikely if current habits hold.', tone: 'gain' });
  else
    out.push({ text: `${projectedOver.map((b) => b.category).join(', ')} may exceed budget if the pace continues.`, tone: 'loss' });

  const trends = categoryIntelligence(txns);
  if (trends[0]) out.push({ text: `${trends[0].category} remains the dominant category and is likely to stay so.`, tone: 'neutral' });

  return out;
}

/* ---------------- Section 8: Financial story ---------------- */
export function financialStory(txns: Transaction[]): string {
  const key = currentMonthKey(txns);
  const cf = cashflowSummary(txns, key);
  const monthLabel = monthsInLedger(txns).slice(-1)[0]?.labelFull ?? 'This month';
  const rate = cf.inflow > 0 ? Math.round((cf.net / cf.inflow) * 100) : 0;
  const trends = categoryIntelligence(txns);
  const top = trends[0];
  const budgets = categoryBudgets(txns, budgetStore.getCaps());
  const over = budgets.filter((b) => b.status === 'over').length;

  const savingsClause = rate >= 40 ? `${monthLabel} was a strong savings month` : rate >= 0 ? `${monthLabel} was a balanced month` : `${monthLabel} saw spending outpace income`;
  const spendClause = cf.outflow > 0 ? ` Spending remained ${rate >= 40 ? 'exceptionally controlled' : 'within normal range'}, totalling \u20B9${formatIndianNumber(cf.outflow)}.` : '';
  const topClause = top ? ` ${top.category} represented the majority of activity at ${Math.round(top.share * 100)}% of spend.` : '';
  const budgetClause = over === 0 ? ' All budget categories stayed comfortably within their limits.' : ` ${over} budget ${over === 1 ? 'category' : 'categories'} ran over limit and deserve attention.`;

  return `${savingsClause}, retaining ${rate}% of income.${spendClause}${topClause}${budgetClause}`;
}
