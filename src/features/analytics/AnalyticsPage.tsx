import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, LineChart } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { CategoryDot } from '../import/components/CategorySelect';
import { formatMoneyFull } from '../import/format';
import type { Transaction } from '../transactions/types';
import { HealthScoreGauge } from './components/HealthScoreGauge';
import { AskPanel } from './components/AskPanel';
import { EmptyState } from '../motion/EmptyState';
import { useLedger } from '../transactions/store';
import { categoryComparison, type ComparePeriod } from './derive';
import {
  financialHealthScore, behaviourSignals, categoryIntelligence, comparisonCards,
  weeklyTimeline, merchantIntelligence, lookingAhead, financialStory,
} from './intelligence';

export function AnalyticsPage() {
  // Read the user's working ledger (same source as the dashboard/reports) so
  // analytics reflects real imported data, not the demo seed.
  const ledger = useLedger();
  const loading = ledger === null;
  const txns = useMemo<Transaction[]>(() => ledger ?? [], [ledger]);

  const [comparePeriod, setComparePeriod] = useState<ComparePeriod>('month');
  const comparison = useMemo(
    () => (txns.length ? categoryComparison(txns, comparePeriod) : null),
    [txns, comparePeriod],
  );

  const v = useMemo(() => {
    if (!txns.length) return null;
    return {
      health: financialHealthScore(txns),
      signals: behaviourSignals(txns),
      cats: categoryIntelligence(txns),
      comparison: comparisonCards(txns),
      weeks: weeklyTimeline(txns),
      merchants: merchantIntelligence(txns),
      ahead: lookingAhead(txns),
      story: financialStory(txns),
    };
  }, [txns]);

  if (loading) {
    return <PageStage><div className="h-[60vh]" /></PageStage>;
  }

  if (!v) {
    return (
      <EmptyState
        icon={LineChart}
        eyebrow="Analytics"
        title="Insights appear once you have data"
        description="Import a statement and Expense Machine surfaces your spending trends, forecasts, and financial health here. Or explore with a sample."
      />
    );
  }

  const maxCat = Math.max(...v.cats.map((c) => c.current), 1);
  const maxWeek = Math.max(...v.weeks.map((w) => Math.max(w.inflow, w.outflow)), 1);
  const maxMerch = Math.max(...v.merchants.mostExpensive.map((m) => m.total), 1);

  return (
    <PageStage>
      <StageItem className="mb-6">
        <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">Intelligence</p>
        <h2 className="font-serif text-[2.4rem] leading-tight text-bright">Financial intelligence</h2>
      </StageItem>

      {/* Section 8 — Financial story (top) */}
      <StageItem className="mb-8">
        <div className="relative overflow-hidden rounded-panel border border-hairline bg-surface p-6">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
            style={{ background: 'radial-gradient(circle, var(--em-glow-brass), transparent 70%)' }} />
          <div className="relative flex items-start gap-3">
            <Sparkles size={18} strokeWidth={1.6} className="mt-0.5 flex-none text-brass" />
            <div>
              <div className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-faint">Your financial story</div>
              <p className="max-w-3xl font-serif text-[1.2rem] leading-relaxed text-soft">{v.story}</p>
            </div>
          </div>
        </div>
      </StageItem>

      {/* Ask Expense Machine — conversational intelligence (Phase 15) */}
      <StageItem className="mb-8">
        <AskPanel txns={txns} />
      </StageItem>

      {/* Section 1 — Health score */}
      <StageItem className="mb-8"><HealthScoreGauge health={v.health} /></StageItem>

      {/* Section 1b — Comparative analytics (MoM / QoQ / YoY) */}
      {comparison && (
        <>
          <StageItem className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
              Comparative analytics — {comparison.currentLabel} vs {comparison.previousLabel}
            </span>
            <span className="flex rounded-control border border-hairline p-0.5">
              {(['month', 'quarter', 'year'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setComparePeriod(p)}
                  className={[
                    'rounded-[5px] px-3 py-1 text-[0.74rem] capitalize transition-colors',
                    comparePeriod === p ? 'bg-brass text-void' : 'text-muted hover:text-soft',
                  ].join(' ')}
                >
                  {p === 'month' ? 'MoM' : p === 'quarter' ? 'QoQ' : 'YoY'}
                </button>
              ))}
            </span>
          </StageItem>
          <StageItem className="mb-8 rounded-panel border border-hairline bg-surface p-6">
            {comparison.categories.length === 0 ? (
              <p className="text-[0.86rem] text-muted">Not enough history yet to compare periods.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {comparison.categories.slice(0, 8).map((c) => {
                  const Icon = c.direction === 'up' ? TrendingUp : c.direction === 'down' ? TrendingDown : Minus;
                  // Spending up = worse (loss tone); down = better (gain tone).
                  const tone = c.direction === 'up' ? 'text-loss' : c.direction === 'down' ? 'text-gain' : 'text-muted';
                  return (
                    <div key={c.category} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-[0.86rem] text-soft">
                        <CategoryDot category={c.category} />{c.category}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="font-mono text-[0.78rem] text-faint">
                          {formatMoneyFull(c.previous)} → {formatMoneyFull(c.current)}
                        </span>
                        <span className={`inline-flex w-16 items-center justify-end gap-1 font-mono text-[0.74rem] ${tone}`}>
                          <Icon size={11} strokeWidth={2} />
                          {c.changePct == null ? 'new' : `${c.changePct > 0 ? '+' : ''}${Math.round(c.changePct)}%`}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </StageItem>
        </>
      )}

      {/* Section 2 — Behaviour signals */}
      <StageItem className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Spending behaviour</StageItem>
      <StageItem className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {v.signals.map((s) => {
          const tone = s.tone === 'gain' ? 'var(--em-gain)' : s.tone === 'loss' ? 'var(--em-loss)' : 'var(--em-brass)';
          return (
            <motion.div key={s.title} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}
              className="rounded-panel border border-hairline bg-surface p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
                <span className="font-mono text-[0.56rem] uppercase tracking-wider text-faint">{s.impact} impact</span>
              </div>
              <div className="mb-1 font-serif text-[1.1rem] text-bright">{s.title}</div>
              <p className="text-[0.82rem] leading-snug text-muted">{s.observation}</p>
            </motion.div>
          );
        })}
      </StageItem>

      {/* Section 3 — Category intelligence */}
      <StageItem className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Category intelligence</StageItem>
      <StageItem className="mb-8 rounded-panel border border-hairline bg-surface p-6">
        <div className="flex flex-col gap-4">
          {v.cats.slice(0, 7).map((c) => {
            const Icon = c.direction === 'up' ? TrendingUp : c.direction === 'down' ? TrendingDown : Minus;
            const chipTone = c.direction === 'up' ? 'text-loss' : c.direction === 'down' ? 'text-gain' : 'text-muted';
            return (
              <div key={c.category} className="flex items-center gap-4">
                <span className="w-6 flex-none font-serif text-[1rem] text-brass">#{c.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[0.86rem] text-soft"><CategoryDot category={c.category} />{c.category}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[0.8rem] text-bright">{formatMoneyFull(c.current)}</span>
                      <span className="w-9 text-right font-mono text-[0.74rem] text-faint">{Math.round(c.share * 100)}%</span>
                      <span className={`inline-flex w-14 items-center justify-end gap-1 font-mono text-[0.72rem] ${chipTone}`}>
                        <Icon size={11} strokeWidth={2} />{c.changePct == null ? 'new' : `${Math.abs(Math.round(c.changePct))}%`}
                      </span>
                    </span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
                    <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'var(--em-brass-deep)' }}
                      initial={{ width: 0 }} animate={{ width: `${(c.current / maxCat) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StageItem>

      {/* Section 4 — Monthly comparison */}
      <StageItem className="mb-3 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
        Monthly comparison
        {v.comparison.simulated && <SimChip />}
      </StageItem>
      <StageItem className="mb-8 grid gap-4 sm:grid-cols-3">
        {v.comparison.cards.map((c) => {
          const up = c.diff > 0;
          const good = c.goodWhenUp ? up : !up;
          const tone = c.diff === 0 ? 'text-muted' : good ? 'text-gain' : 'text-loss';
          const max = Math.max(Math.abs(c.previous), Math.abs(c.current), 1);
          return (
            <div key={c.label} className="rounded-panel border border-hairline bg-surface p-5">
              <div className="mb-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">{c.label}</div>
              <div className="mb-1 font-num text-[1.4rem] text-bright">{formatMoneyFull(c.current)}</div>
              <div className={`mb-4 text-[0.78rem] ${tone}`}>
                {c.pct == null ? 'new' : `${c.pct > 0 ? '+' : ''}${Math.round(c.pct)}% vs last month`}
              </div>
              <div className="flex flex-col gap-1.5">
                <Bar label="Prev" value={Math.abs(c.previous)} max={max} tone="var(--em-hairline-strong)" />
                <Bar label="Now" value={Math.abs(c.current)} max={max} tone="var(--em-brass-deep)" />
              </div>
            </div>
          );
        })}
      </StageItem>

      {/* Section 5 — Weekly timeline */}
      <StageItem className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Spending timeline</StageItem>
      <StageItem className="mb-8 rounded-panel border border-hairline bg-surface p-6">
        <div className="grid grid-cols-4 gap-4">
          {v.weeks.map((w) => (
            <div key={w.label} className="flex flex-col items-center">
              <div className="flex h-32 w-full items-end justify-center gap-1.5">
                <motion.div className="w-3.5 rounded-t" style={{ background: 'var(--em-gain)' }}
                  initial={{ height: 0 }} animate={{ height: `${(w.inflow / maxWeek) * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                <motion.div className="w-3.5 rounded-t" style={{ background: 'var(--em-loss)' }}
                  initial={{ height: 0 }} animate={{ height: `${(w.outflow / maxWeek) * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <div className="mt-2 font-mono text-[0.66rem] text-muted">{w.label}</div>
              <div className={`font-mono text-[0.7rem] ${w.net >= 0 ? 'text-gain' : 'text-loss'}`}>{formatMoneyFull(w.net)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-5 text-[0.7rem] text-faint">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--em-gain)' }} />Inflow</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--em-loss)' }} />Outflow</span>
        </div>
      </StageItem>

      {/* Section 6 — Merchant intelligence */}
      <StageItem className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Merchant intelligence</StageItem>
      <StageItem className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-panel border border-hairline bg-surface p-6">
          <h3 className="mb-4 font-serif text-[1.1rem] text-bright">Most expensive</h3>
          <div className="flex flex-col gap-3">
            {v.merchants.mostExpensive.map((m) => (
              <div key={m.merchant}>
                <div className="mb-1 flex items-center justify-between text-[0.84rem]">
                  <span className="text-soft">{m.merchant}</span>
                  <span className="font-mono text-bright">{formatMoneyFull(m.total)}</span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(m.total / maxMerch) * 100}%`, background: 'var(--em-brass-deep)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-panel border border-hairline bg-surface p-6">
            <h3 className="mb-4 font-serif text-[1.1rem] text-bright">Most frequent</h3>
            <div className="flex flex-col gap-2.5">
              {v.merchants.mostFrequent.map((m) => (
                <div key={m.merchant} className="flex items-center justify-between text-[0.84rem]">
                  <span className="text-soft">{m.merchant}</span>
                  <span className="font-mono text-muted">{m.count}×</span>
                </div>
              ))}
            </div>
          </div>
          {v.merchants.riskMerchant ? (
            <div className="rounded-panel border border-loss/40 bg-surface p-5">
              <div className="mb-1.5 flex items-center gap-2">
                <AlertTriangle size={14} className="text-loss" />
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-loss">Concentration risk</span>
              </div>
              <p className="text-[0.84rem] text-soft">
                {v.merchants.riskMerchant.merchant} is {Math.round(v.merchants.riskMerchant.share * 100)}% of all merchant spend — a notable concentration.
              </p>
            </div>
          ) : (
            <div className="rounded-panel border border-hairline bg-surface p-5">
              <div className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-gain">Healthy spread</div>
              <p className="text-[0.84rem] text-muted">
                Top 3 merchants are {Math.round(v.merchants.concentration * 100)}% of spend — no single merchant dominates.
              </p>
            </div>
          )}
        </div>
      </StageItem>

      {/* Section 7 — Looking ahead */}
      <StageItem className="mb-3 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
        Looking ahead <SimChip />
      </StageItem>
      <StageItem className="rounded-panel border border-hairline bg-surface p-6">
        <div className="flex flex-col gap-3.5">
          {v.ahead.map((p, i) => {
            const tone = p.tone === 'gain' ? 'var(--em-gain)' : p.tone === 'loss' ? 'var(--em-loss)' : 'var(--em-brass)';
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: tone }} />
                <p className="text-[0.88rem] leading-snug text-soft">{p.text}</p>
              </div>
            );
          })}
        </div>
      </StageItem>
    </PageStage>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 flex-none font-mono text-[0.6rem] uppercase tracking-wider text-faint">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-elevated">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: tone }}
          initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

function SimChip() {
  return (
    <span className="rounded-full border border-brass-deep/50 px-2 py-0.5 font-mono text-[0.52rem] uppercase tracking-wider text-brass">
      Simulated insights
    </span>
  );
}
