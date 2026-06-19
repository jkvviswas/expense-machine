import { useEffect, useMemo, useState } from 'react';
import { FileText, FileSpreadsheet, TrendingUp, TrendingDown, PiggyBank, Wallet, Trash2 } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { EmptyState } from '../motion/EmptyState';
import { Money } from '../import/components/Money';
import { CategoryDot } from '../import/components/CategorySelect';
import { formatMoneyFull, formatDate } from '../import/format';
import { ComparisonBar } from '../analytics/components/TrendChart';
import { InsightList } from '../analytics/components/InsightList';
import { naturalInsights } from '../analytics/behaviour';
import type { Transaction } from '../transactions/types';
import { useLedger } from '../transactions/store';
import { deleteTransactionWithUndo } from '../transactions/actions';
import { buildMonthlyReport, exporters } from './derive';
import { monthsInLedger } from '../analytics/derive';
import { useSettings } from '../settings/store';
import { categoryBudgets } from '../budgets/derive';
import { budgetStore } from '../budgets/store';

export function ReportsPage() {
  const ledger = useLedger();
  const loading = ledger === null;
  const txns: Transaction[] = useMemo(() => ledger ?? [], [ledger]);

  // Period switcher: every month present in the ledger, newest first. The report
  // recomputes for whichever month is selected (default = most recent).
  const months = useMemo(() => monthsInLedger(txns).slice().reverse(), [txns]);
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const activeKey = periodKey && months.some((m) => m.key === periodKey)
    ? periodKey
    : (months[0]?.key ?? null);

  const report = useMemo(
    () => (txns.length ? buildMonthlyReport(txns, activeKey ?? undefined) : null),
    [txns, activeKey],
  );
  const budgets = useMemo(() => (txns.length ? categoryBudgets(txns, budgetStore.getCaps()) : []), [txns]);
  const insights = useMemo(() => (txns.length ? naturalInsights(txns) : []), [txns]);
  const maxCat = useMemo(() => (report ? Math.max(...report.categories.map((c) => c.amount), 1) : 1), [report]);
  const settings = useSettings();

  // PDF preview metadata is computed lazily: the jsPDF engine is dynamically
  // imported so it never ships in the initial bundle. Until it resolves we show
  // a neutral placeholder.
  const [pdfMeta, setPdfMeta] = useState<{ pages: number; sizeKb: number } | null>(null);
  useEffect(() => {
    if (!report) return;
    let alive = true;
    void (async () => {
      try {
        const { generateReportPdf } = await import('./pdf');
        const doc = generateReportPdf(report, txns);
        const pages = doc.getNumberOfPages();
        const bytes = (doc.output('arraybuffer') as ArrayBuffer).byteLength;
        if (alive) setPdfMeta({ pages, sizeKb: Math.round(bytes / 1024) });
      } catch (err: unknown) {
        console.error('[Reports] PDF preview generation failed:', err);
        if (alive) setPdfMeta(null);
      }
    })();
    return () => { alive = false; };
  }, [report, txns]);

  if (loading) {
    return <PageStage><div className="h-[60vh]" /></PageStage>;
  }

  if (!report) {
    return (
      <EmptyState
        icon={FileText}
        eyebrow="Reports"
        title="Your report is one import away"
        description="Bring in a statement and Expense Machine composes an executive summary you can export to Excel or PDF. Or explore with a sample."
      />
    );
  }

  const generatedOn = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const topCategory = report.categories[0];
  const topExpense = report.largestExpenses[0];
  const overBudgets = budgets.filter((b) => b.status === 'over').length;
  const savingsPct = Math.round(report.savingsRate * 100);

  const headline = [
    { label: 'Total income', value: report.income, tone: 'gain' as const },
    { label: 'Total spending', value: report.spending, tone: 'loss' as const },
    { label: 'Net savings', value: report.netSavings, tone: report.netSavings >= 0 ? ('gain' as const) : ('loss' as const) },
    { label: 'Safe to spend', value: report.safe, tone: 'neutral' as const },
    { label: 'Budget health', value: report.budgetScore, tone: 'neutral' as const, isScore: true },
  ];

  const highlights = [
    { icon: TrendingUp, label: 'Top category', value: topCategory ? topCategory.category : '—', sub: topCategory ? `${formatMoneyFull(topCategory.amount)} · ${Math.round(topCategory.share * 100)}%` : '' },
    { icon: TrendingDown, label: 'Largest expense', value: topExpense ? topExpense.merchant : '—', sub: topExpense ? formatMoneyFull(Math.abs(topExpense.amount)) : '' },
    { icon: PiggyBank, label: 'Savings rate', value: `${savingsPct}%`, sub: 'of income kept' },
    { icon: Wallet, label: 'Budgets on track', value: `${budgets.length - overBudgets}/${budgets.length}`, sub: overBudgets > 0 ? `${overBudgets} over limit` : 'all within limit' },
  ];

  // Executive summary narrative (composed from derived values; no new math)
  const summary =
    `In ${report.monthLabel}, you brought in ${formatMoneyFull(report.income)} and spent ` +
    `${formatMoneyFull(report.spending)}, keeping ${savingsPct}% of your income. ` +
    `${topCategory ? `${topCategory.category} was your heaviest category at ${formatMoneyFull(topCategory.amount)}. ` : ''}` +
    `${overBudgets === 0 ? 'Every budget stayed within its limit this month.' : `${overBudgets} ${overBudgets === 1 ? 'budget went' : 'budgets went'} over limit.`} ` +
    `Your Safe-to-Spend position stands at ${formatMoneyFull(report.safe)}.`;

  return (
    <PageStage>
      {/* Report header */}
      <StageItem className="mb-7 border-b border-hairline pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-brass">
              Monthly Financial Report
            </p>
            <h2 className="font-serif text-[2.4rem] leading-tight text-bright">{report.monthLabel}</h2>
          </div>
          <div className="flex items-center gap-2.5">
            {months.length > 1 && (
              <select
                value={activeKey ?? ''}
                onChange={(e) => setPeriodKey(e.target.value)}
                aria-label="Select report period"
                className="h-[42px] rounded-control border border-hairline bg-surface px-3 text-[0.82rem] text-soft transition-colors hover:border-brass-deep focus:border-brass focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m.key} value={m.key}>{m.labelFull} {m.year}</option>
                ))}
              </select>
            )}
            {exporters.map((ex) => {
              const Icon = ex.format === 'xlsx' ? FileSpreadsheet : FileText;
              return (
                <button key={ex.format} type="button" onClick={() => { void ex.export(report, txns); }}
                  className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright">
                  <Icon size={15} strokeWidth={1.75} />{ex.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* report meta line */}
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-2">
          <Meta label="Generated on" value={generatedOn} />
          <Meta label="Reference month" value={report.monthLabel} />
          <Meta label="Data source" value="Expense Machine ledger" />
        </div>
      </StageItem>

      {/* Executive summary */}
      <StageItem className="mb-7">
        <div className="rounded-panel border border-hairline bg-surface p-6">
          <h3 className="mb-2.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Executive summary</h3>
          <p className="max-w-3xl text-[0.96rem] leading-relaxed text-soft">{summary}</p>
        </div>
      </StageItem>

      {/* Headline figures */}
      <StageItem className="mb-5 grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-5">
        {headline.map((h) => {
          const toneClass = h.tone === 'gain' ? 'text-gain' : h.tone === 'loss' ? 'text-loss' : 'text-bright';
          return (
            <div key={h.label} className="bg-surface px-5 py-4">
              <div className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">{h.label}</div>
              <div className={`font-num text-[1.25rem] ${toneClass}`}>
                {h.isScore ? `${h.value}` : formatMoneyFull(h.value)}
              </div>
            </div>
          );
        })}
      </StageItem>

      {/* Financial highlights */}
      <StageItem className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Financial highlights</StageItem>
      <StageItem className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((h) => {
          const Icon = h.icon;
          return (
            <div key={h.label} className="rounded-panel border border-hairline bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon size={14} strokeWidth={1.75} className="text-brass" />
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">{h.label}</span>
              </div>
              <div className="truncate font-serif text-[1.35rem] leading-tight text-bright">{h.value}</div>
              <div className="mt-1 truncate text-[0.76rem] text-muted">{h.sub}</div>
            </div>
          );
        })}
      </StageItem>

      {/* Spending distribution + Largest transactions */}
      <StageItem className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
          <div className="border-b border-hairline px-6 py-4"><h3 className="font-serif text-[1.15rem] text-bright">Spending distribution</h3></div>
          <div className="grid grid-cols-[1fr_110px_56px] gap-3 border-b border-hairline px-6 py-2.5">
            <HeaderCell>Category</HeaderCell><HeaderCell className="text-right">Amount</HeaderCell><HeaderCell className="text-right">Share</HeaderCell>
          </div>
          {report.categories.map((c) => (
            <div key={c.category} className="grid grid-cols-[1fr_110px_56px] items-center gap-3 border-b border-hairline px-6 py-3 last:border-b-0">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 text-[0.85rem] text-soft"><CategoryDot category={c.category} /><span className="truncate">{c.category}</span></div>
                <ComparisonBar value={c.amount} max={maxCat} />
              </div>
              <span className="text-right font-mono text-[0.82rem] text-bright">{formatMoneyFull(c.amount)}</span>
              <span className="text-right font-mono text-[0.78rem] text-muted">{Math.round(c.share * 100)}%</span>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
          <div className="border-b border-hairline px-6 py-4"><h3 className="font-serif text-[1.15rem] text-bright">Largest transactions</h3></div>
          <div className="grid grid-cols-[60px_1fr_96px] gap-3 border-b border-hairline px-6 py-2.5">
            <HeaderCell>Date</HeaderCell><HeaderCell>Merchant</HeaderCell><HeaderCell className="text-right">Amount</HeaderCell>
          </div>
          {report.largestExpenses.map((t) => (
            <div key={t.id} className="group grid grid-cols-[60px_1fr_96px_32px] items-center gap-3 border-b border-hairline px-6 py-3 last:border-b-0">
              <span className="font-mono text-[0.74rem] text-muted">{formatDate(t.date)}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[0.85rem] text-bright"><CategoryDot category={t.category} /><span className="truncate">{t.merchant}</span></div>
                <div className="ml-4 truncate text-[0.7rem] text-faint">{t.category}</div>
              </div>
              <Money amount={t.amount} className="text-right text-[0.82rem]" />
              <button
                type="button"
                aria-label={`Delete ${t.merchant}`}
                onClick={() => deleteTransactionWithUndo(t)}
                className="flex h-7 w-7 items-center justify-center justify-self-end rounded-control text-faint opacity-0 transition-all hover:bg-loss/10 hover:text-loss group-hover:opacity-100"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      </StageItem>

      {/* Budget analysis + Insights */}
      <StageItem className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-panel border border-hairline bg-surface p-6">
          <h3 className="mb-5 font-serif text-[1.15rem] text-bright">Budget analysis</h3>
          <div className="flex flex-col gap-4">
            {budgets.map((b) => {
              const tone = b.status === 'over' ? 'var(--em-loss)' : b.status === 'watch' ? 'var(--em-watch)' : 'var(--em-brass-deep)';
              return (
                <div key={b.category}>
                  <div className="mb-1.5 flex items-center justify-between text-[0.82rem]">
                    <span className="flex items-center gap-2 text-soft"><CategoryDot category={b.category} />{b.category}</span>
                    <span className="font-mono text-[0.78rem] text-muted">{formatMoneyFull(b.spent)} <span className="text-faint">/ {formatMoneyFull(b.cap)}</span></span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(b.ratio, 1) * 100}%`, background: tone }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <InsightList insights={insights} />
      </StageItem>

      {/* Export center */}
      <StageItem className="mt-6">
        <div className="rounded-panel border border-hairline bg-surface p-6">
          <h3 className="mb-4 font-serif text-[1.15rem] text-bright">Export center</h3>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-4">
              <ExportMeta label="PDF pages" value={pdfMeta ? `${pdfMeta.pages}` : '—'} />
              <ExportMeta label="PDF size" value={pdfMeta ? `${pdfMeta.sizeKb} KB` : '—'} />
              <ExportMeta label="Report style" value={settings.reportStyle === 'executive' ? 'Executive' : 'Detailed'} />
              <ExportMeta label="Generated" value={generatedOn} />
            </div>
            <div className="flex items-center gap-2.5">
              {exporters.map((ex) => {
                const Icon = ex.format === 'xlsx' ? FileSpreadsheet : FileText;
                const primary = ex.format === settings.defaultExport;
                return (
                  <button key={ex.format} type="button" onClick={() => { void ex.export(report, txns); }}
                    className={[
                      'flex items-center gap-2 rounded-control px-4 py-2.5 text-[0.84rem] transition-colors duration-300 ease-lux',
                      primary
                        ? 'bg-brass text-void hover:bg-brass-bright'
                        : 'border border-hairline bg-surface text-soft hover:border-brass-deep hover:text-bright',
                    ].join(' ')}>
                    <Icon size={15} strokeWidth={1.75} />{ex.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-4 text-[0.76rem] text-faint">
            Excel exports a five-sheet workbook (Summary, Transactions, Category, Budget, Insights). PDF generates a {pdfMeta?.pages ?? 7}-page executive report.
          </p>
        </div>
      </StageItem>
    </PageStage>
  );
}

function ExportMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="font-mono text-[0.9rem] text-bright">{value}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="text-[0.84rem] text-soft">{value}</div>
    </div>
  );
}

function HeaderCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint ${className}`}>{children}</span>;
}
