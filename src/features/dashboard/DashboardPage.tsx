import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import type { Transaction } from '../transactions/types';
import { useLedger } from '../transactions/store';
import { resolvePeriod, filterByPeriod, PERIOD_OPTIONS, type DashboardPeriod } from './period';
import {
  safeToSpend,
  obligationsFromCommitments,
  totalObligations,
  budgetHealth,
  cashflowSeries,
  recentActivity,
} from './derive';
import { useCommitments } from '../commitments/store';
import { useAccounts, computeTotalBalance } from '../accounts/store';
import { ClarityMoment } from './components/ClarityMoment';
import { NetPositionMoment } from './components/NetPositionMoment';
import { CurrentBalancePill } from './components/CurrentBalancePill';
import { ContextStrip } from './components/ContextStrip';
import { RecentActivity } from './components/RecentActivity';
import { UpcomingCommitments } from './components/UpcomingCommitments';
import { BudgetHealth } from './components/BudgetHealth';
import { Cashflow } from './components/Cashflow';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { DashboardEmpty } from './components/DashboardEmpty';
import { ReviewSpotlight } from './components/ReviewSpotlight';
import { BirthdayBanner } from './components/BirthdayBanner';

export function DashboardPage() {
  const navigate = useNavigate();
  // Read the persisted working ledger (seeded from the locked data source on
  // first run, so figures reconcile exactly until the user imports/edits).
  const ledger = useLedger();
  const loading = ledger === null;
  const txns: Transaction[] = useMemo(() => ledger ?? [], [ledger]);

  const [period, setPeriod] = useState<DashboardPeriod>('thisMonth');
  const commitments = useCommitments();
  const accounts = useAccounts();

  // Current Balance uses the SAME formula as the Accounts page (shared helper),
  // so the two figures are always identical and opening balances are never
  // double-counted.
  const currentBalance = useMemo(
    () => computeTotalBalance(txns, accounts),
    [txns, accounts],
  );

  const derived = useMemo(() => {
    if (txns.length === 0) return null;
    // Anchor to the ledger's most recent activity, so imports from any month
    // reconcile (a fixed "current month" can show ₹0 while activity exists).
    const latestIso = txns.reduce((m, t) => (t.date > m ? t.date : m), txns[0].date);
    const range = resolvePeriod(period, latestIso);
    const scoped = filterByPeriod(txns, range);
    // System-generated entries (statement opening balance) stay in the ledger
    // for account-balance reconciliation, but must not distort flow metrics
    // (income, spending, safe-to-spend, cashflow). Exclude them here.
    const flowTxns = txns.filter((t) => !t.isSystemGenerated);
    // The locked safeToSpend is month-scoped; for the hero/budget logic anchor
    // it to the period's end month.
    const ref = new Date(range.end + 'T00:00:00');
    const sts = safeToSpend(flowTxns, commitments, ref);

    // Period-accurate income/spending sum the whole selected window (so quarter/
    // year/YTD show full-range totals, not just one month). Still one ledger.
    const flow = scoped.filter((t) => !t.isSystemGenerated);
    const income = flow.reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0);
    const spending = flow.reduce((s, t) => (t.amount < 0 ? s + Math.abs(t.amount) : s), 0);

    const obligations = obligationsFromCommitments(commitments);
    return {
      sts: { ...sts, income, spending, remaining: income - spending },
      periodLabel: range.label,
      scopedCount: scoped.length,
      obligations,
      obligationsTotal: totalObligations(obligations),
      budgets: budgetHealth(flowTxns, ref),
      cashflow: cashflowSeries(flowTxns, 30, ref),
      recent: recentActivity(scoped.length ? scoped : txns),
    };
  }, [txns, period, commitments]);

  if (loading) {
    return (
      <PageStage>
        <DashboardSkeleton />
      </PageStage>
    );
  }

  // Hydrated but empty → clean-start user. Invite them to import or load sample.
  if (!derived) {
    return <DashboardEmpty />;
  }

  const { sts, obligations, obligationsTotal, budgets, cashflow, recent, periodLabel } = derived;
  const hasBudgets = budgets.length > 0;

  return (
    <PageStage>
      <StageItem><BirthdayBanner /></StageItem>
      {/* Row 0 — Period switcher: filters every KPI to the chosen window. */}
      <StageItem className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-faint">
          Showing · {periodLabel}
        </span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
          aria-label="Dashboard period"
          className="h-9 rounded-control border border-hairline bg-surface px-3 text-[0.82rem] text-soft transition-colors hover:border-brass-deep focus:border-brass focus:outline-none"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </StageItem>

      {/* Row 1 — Executive metric row (supporting evidence, above the hero) */}
      <StageItem className="mb-2">
        <ContextStrip
          income={sts.income}
          spending={sts.spending}
          upcoming={obligationsTotal}
          remaining={sts.remaining}
        />
      </StageItem>

      {/* Row 2 — the hero. Safe to Spend is a budget concept, so it only
          appears once the user has created budgets. Otherwise the hero shows
          the month's net position, derived purely from transactions. The
          Current Balance pill is anchored beneath the hero ring (compact,
          premium, visually tied to Net This Month). */}
      <StageItem className="mb-6 sm:mb-10">
        {hasBudgets ? (
          <ClarityMoment safe={sts.safe} remaining={sts.remaining} />
        ) : (
          <NetPositionMoment net={sts.income - sts.spending} />
        )}
        <div className="mt-5 flex justify-center">
          <CurrentBalancePill balance={currentBalance} />
        </div>
      </StageItem>

      {/* Row 3 — Cashflow + Recent activity */}
      <StageItem className="mb-6 grid gap-6 lg:grid-cols-2">
        <Cashflow series={cashflow} />
        <RecentActivity items={recent} />
      </StageItem>

      {/* Row 4 — Upcoming + Budget health (budget health only when budgets exist) */}
      <StageItem className="grid gap-6 lg:grid-cols-2">
        <UpcomingCommitments obligations={obligations} total={obligationsTotal} />
        {hasBudgets && <BudgetHealth rows={budgets} />}
      </StageItem>

      {/* Community review spotlight (additive; renders only when reviews exist) */}
      <StageItem className="mt-6">
        <ReviewSpotlight />
      </StageItem>

      {/* quiet footer link */}
      <StageItem className="mt-8 text-center">
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="text-[0.82rem] text-muted transition-colors hover:text-soft"
        >
          See your full ledger →
        </button>
      </StageItem>
    </PageStage>
  );
}
