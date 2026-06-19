import type { Transaction } from '../transactions/types';
import { cashflowSummary, categoryTrends, merchantInsights } from './derive';
import { financialHealthScore } from './intelligence';
import { spendingForecast, predictOverruns } from './forecast';
import { formatMoneyFull } from '../import/format';

/**
 * ============================================================================
 *  ASK PROVIDER ABSTRACTION  (Phase 15)
 * ============================================================================
 *
 * "Ask Expense Machine" answers questions about the user's finances. To keep
 * the product honest, answering is behind a provider interface with two
 * implementations:
 *
 *   1. localProvider  — the DEFAULT. A deterministic, rule-based engine that
 *      computes answers from the real ledger (forecasts, trends, overruns,
 *      health). It is NOT an LLM and never claims to be. Every answer is
 *      derived from inspectable math.
 *
 *   2. remoteProvider — a clearly-labelled seam for a future Claude/OpenAI
 *      integration. It is INERT unless an API key is configured via env
 *      (VITE_ANTHROPIC_API_KEY / VITE_OPENAI_API_KEY). With no key it reports
 *      that it is not configured — it does not fabricate AI output. The network
 *      call is intentionally left unimplemented (a browser-exposed key is
 *      insecure; real use needs a backend proxy), and this is stated plainly.
 *
 * The UI uses whichever provider `getAskProvider()` returns; today that is
 * always the local engine, so there are no fake AI claims anywhere.
 */

export interface AskAnswer {
  /** Plain-text answer derived from real data. */
  text: string;
  /** Short machine tag for the matched intent (for UI accenting). */
  intent: string;
  /** How the answer was produced — surfaced to the user for transparency. */
  source: 'rule-based' | 'llm';
}

export interface AskProvider {
  readonly id: string;
  readonly label: string;
  /** Whether this provider can actually answer in the current environment. */
  isAvailable(): boolean;
  ask(question: string, txns: Transaction[]): Promise<AskAnswer>;
}

// --- intent matching (transparent keyword routing) --------------------------
type Intent =
  | 'savings-forecast'
  | 'spending-change'
  | 'reduce-category'
  | 'overrun'
  | 'health'
  | 'top-merchant'
  | 'income'
  | 'help';

function classify(q: string): Intent {
  const s = q.toLowerCase();
  if (/(year|end|future|predict|forecast).*(saving|save)|saving.*(year|end|predict|forecast)/.test(s)) return 'savings-forecast';
  if (/(why|increase|went up|rose|higher|more).*(spend|spending)|spending.*(increase|change|up)/.test(s)) return 'spending-change';
  if (/(reduce|cut|lower|trim|save).*(category|spend|first|where)/.test(s)) return 'reduce-category';
  if (/(over budget|overrun|exceed|over my|breach|on track)/.test(s)) return 'overrun';
  if (/(health|how am i doing|financial.*(shape|state)|doing financially)/.test(s)) return 'health';
  if (/(merchant|where.*money|biggest|most.*(spend|paid)|top)/.test(s)) return 'top-merchant';
  if (/(income|earn|revenue|made)/.test(s)) return 'income';
  return 'help';
}

// --- the local rule-based engine --------------------------------------------
function answerLocally(question: string, txns: Transaction[]): AskAnswer {
  const intent = classify(question);
  if (txns.length === 0) {
    return { text: 'There are no transactions yet. Import a statement and I can analyse it.', intent, source: 'rule-based' };
  }

  switch (intent) {
    case 'savings-forecast': {
      const f = spendingForecast(txns);
      if (!f || !f.yearEndSavings) return { text: 'I need a bit more history to forecast savings.', intent, source: 'rule-based' };
      const { value, monthsRemaining, confidence } = f.yearEndSavings;
      const verb = value >= 0 ? 'save' : 'be short by';
      return {
        text: `Projecting your current net-savings trend across the ${monthsRemaining} remaining month${monthsRemaining === 1 ? '' : 's'}, you're on track to ${verb} about ${formatMoneyFull(Math.abs(value))} by year end. Confidence is ${confidence} — based on ${f.net.history} months of history. This is a straight-line projection, not a guarantee.`,
        intent,
        source: 'rule-based',
      };
    }
    case 'spending-change': {
      const trends = categoryTrends(txns).filter((t) => (t.changePct ?? 0) !== 0);
      const risers = trends
        .filter((t) => (t.changePct ?? 0) > 0)
        .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
      if (risers.length === 0) return { text: 'Spending is broadly flat versus the prior month — no category stands out as rising.', intent, source: 'rule-based' };
      const top = risers[0];
      const others = risers.slice(1, 3).map((t) => t.category).join(' and ');
      return {
        text: `The biggest driver is ${top.category}, up ${Math.round(top.changePct ?? 0)}% versus the prior month (${formatMoneyFull(top.current)} vs ${formatMoneyFull(top.previous)}).${others ? ` ${others} also rose.` : ''}`,
        intent,
        source: 'rule-based',
      };
    }
    case 'reduce-category': {
      const overruns = predictOverruns(txns);
      if (overruns.length > 0) {
        const o = overruns[0];
        return {
          text: `Start with ${o.category}. At your current pace it's projected to reach ${formatMoneyFull(o.projected)} against a ${formatMoneyFull(o.cap)} budget — about ${formatMoneyFull(o.projectedOver)} over. Trimming here has the most impact.`,
          intent,
          source: 'rule-based',
        };
      }
      const trends = categoryTrends(txns).sort((a, b) => b.current - a.current);
      if (trends.length === 0) return { text: 'No spending categories to analyse yet.', intent, source: 'rule-based' };
      return {
        text: `No budgets are projected to overrun. Your largest spend is ${trends[0].category} at ${formatMoneyFull(trends[0].current)} — that's where reductions would free up the most cash.`,
        intent,
        source: 'rule-based',
      };
    }
    case 'overrun': {
      const overruns = predictOverruns(txns);
      if (overruns.length === 0) return { text: 'Good news — no category budgets are projected to be exceeded at your current pace.', intent, source: 'rule-based' };
      const list = overruns.slice(0, 3).map((o) => `${o.category} (~${formatMoneyFull(o.projectedOver)} over)`).join(', ');
      return { text: `These look likely to go over budget this month: ${list}. Projection is based on spend so far this month extrapolated to month-end.`, intent, source: 'rule-based' };
    }
    case 'health': {
      const h = financialHealthScore(txns);
      const weakest = [...h.components].sort((a, b) => a.value - b.value)[0];
      return {
        text: `Your financial health score is ${h.score}/100 — ${h.label.toLowerCase()}, trending ${h.trend}. The component with the most room to improve is ${weakest.label.toLowerCase()} (${Math.round(weakest.value * 100)}%).`,
        intent,
        source: 'rule-based',
      };
    }
    case 'top-merchant': {
      const m = merchantInsights(txns, 3);
      if (m.length === 0) return { text: 'No merchant spending to summarise yet.', intent, source: 'rule-based' };
      const top = m[0];
      return {
        text: `Your largest merchant is ${top.merchant} at ${formatMoneyFull(top.total)} across ${top.count} transaction${top.count === 1 ? '' : 's'}.${m[1] ? ` Next are ${m[1].merchant} and ${m[2]?.merchant ?? ''}.` : ''}`,
        intent,
        source: 'rule-based',
      };
    }
    case 'income': {
      const cf = cashflowSummary(txns);
      return {
        text: `This month you've received ${formatMoneyFull(cf.inflow)} in income against ${formatMoneyFull(cf.outflow)} of spending — a net of ${formatMoneyFull(cf.net)}.`,
        intent,
        source: 'rule-based',
      };
    }
    default:
      return {
        text: 'I can answer questions about your spending trends, savings forecast, budget overruns, financial health, and top merchants. Try “Predict my savings by year end” or “What category should I reduce first?”.',
        intent,
        source: 'rule-based',
      };
  }
}

export const localProvider: AskProvider = {
  id: 'local',
  label: 'Built-in analysis',
  isAvailable: () => true,
  async ask(question, txns) {
    return answerLocally(question, txns);
  },
};

// --- remote (Claude/OpenAI) seam — DISABLED for security ---------------------
// Browser-exposed API keys (VITE_* vars are inlined into the JS bundle) are a
// credential leak. This provider is intentionally disabled: even if a key is
// present in the env, it MUST NOT be sent from the client. A backend proxy is
// required for real LLM integration.
export const remoteProvider: AskProvider = {
  id: 'remote',
  label: 'Claude / OpenAI (requires backend proxy)',
  isAvailable: () => false,
  async ask(question, txns) {
    const local = answerLocally(question, txns);
    return {
      ...local,
      text: `${local.text}\n\n(LLM provider disabled — browser-exposed API keys are insecure. Configure a backend proxy to enable Claude/OpenAI.)`,
    };
  },
};

let active: AskProvider = localProvider;
export function setAskProvider(p: AskProvider) {
  active = p;
}
export function getAskProvider(): AskProvider {
  return active;
}
