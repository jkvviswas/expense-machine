import { motion } from 'framer-motion';
import { ArrowRight, Landmark, CalendarRange, Sparkles, FlaskConical, ShieldCheck } from 'lucide-react';
import { Reveal, RevealItem } from './Reveal';
import { Money } from './Money';
import { CategoryDot } from './CategorySelect';
import { formatDateRange, formatDate } from '../format';
import type { ExtractionSummary } from '../parsing/summary';
import type { ImportConfidence } from '../parsing/validation';
import { type ParsedTransaction, type StatementMeta } from '../types';

interface ExtractionScreenProps {
  statement: StatementMeta | null;
  transactions: ParsedTransaction[];
  summary: ExtractionSummary;
  confidence: ImportConfidence;
  isMock: boolean;
  onContinue: () => void;
}

const bandColor: Record<ImportConfidence['band'], string> = {
  high: 'var(--em-gain)',
  medium: 'var(--em-watch)',
  low: 'var(--em-loss)',
};

export function ExtractionScreen({
  statement,
  transactions,
  summary,
  confidence,
  isMock,
  onContinue,
}: ExtractionScreenProps) {
  // Real, derived headline — reflects exactly what was parsed.
  const headlineCount = summary.count;
  const headlineCategories = summary.categoriesUsed;

  // Category bars from the real breakdown (ranked by spend).
  const detected = summary.categoryBreakdown;
  const maxCount = Math.max(1, ...detected.map((c) => c.count));

  const preview = transactions.slice(0, 6);

  return (
    <Reveal className="mx-auto max-w-4xl">
      <RevealItem>
        <div className="mb-7 text-center">
          <p className="mb-3 flex items-center justify-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
            {isMock ? 'Detected Statement · Sample' : `Detected ${statement?.accountName ?? 'Statement'}`}
            {isMock && (
              <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[0.55rem] text-muted">
                <FlaskConical size={9} />
                SAMPLE DATA
              </span>
            )}
            {!isMock && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[0.55rem]"
                style={{ color: bandColor[confidence.band] }}
              >
                <ShieldCheck size={9} />
                {confidence.band.toUpperCase()} CONFIDENCE · {Math.round(confidence.score * 100)}%
              </span>
            )}
          </p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">
            {headlineCount} transaction{headlineCount === 1 ? '' : 's'} found
          </h2>
          <p className="mt-2 text-[0.95rem] text-muted">
            {headlineCategories} categor{headlineCategories === 1 ? 'y' : 'ies'}{' '}
            detected across your statement period.
          </p>
        </div>
      </RevealItem>

      {/* detected meta + totals */}
      <RevealItem>
        <div className="mb-5 grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <Cell icon={<Landmark size={15} className="text-muted" />} label="Account">
            <span className="text-bright">{statement?.accountName ?? 'Imported Account'}</span>{' '}
            <span className="font-mono text-faint">{statement?.accountMask ?? '••••'}</span>
          </Cell>
          <Cell
            icon={<CalendarRange size={15} className="text-muted" />}
            label="Statement period"
          >
            <span className="text-bright">
              {summary.dateRangeStart && summary.dateRangeEnd
                ? formatDateRange(summary.dateRangeStart, summary.dateRangeEnd)
                : '—'}
            </span>
          </Cell>
          <Cell label="Total inflow">
            <Money amount={summary.inflow} />
          </Cell>
          <Cell label="Total outflow">
            <Money amount={summary.outflow} />
          </Cell>
          {statement?.openingBalance != null && (
            <Cell label="Opening balance">
              <Money amount={statement.openingBalance} />
            </Cell>
          )}
          <Cell label="Net change">
            <Money amount={summary.inflow + summary.outflow} />
          </Cell>
          {statement?.closingBalance != null && (
            <Cell label="Closing balance">
              <Money amount={statement.closingBalance} />
            </Cell>
          )}
        </div>
        {statement?.openingBalance != null && statement?.closingBalance != null && (
          <div className="mt-4 border-t border-hairline pt-3 text-[0.78rem]">
            {Math.abs(statement.openingBalance + summary.inflow + summary.outflow - statement.closingBalance) < 1 ? (
              <span className="text-gain">✓ Reconciled — opening + inflow − outflow matches the statement closing balance.</span>
            ) : (
              <span className="text-watch">Opening + net does not match the statement closing balance — some rows may be missing.</span>
            )}
          </div>
        )}
      </RevealItem>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* category detection summary */}
        <RevealItem>
          <div className="h-full rounded-panel border border-hairline bg-surface p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <Sparkles size={16} strokeWidth={1.75} className="text-brass" />
              <h3 className="font-serif text-[1.15rem] text-bright">
                Categories detected
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {detected.map((c) => {
                const share = c.count / maxCount;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="flex w-28 flex-none items-center gap-2 text-[0.84rem] text-soft">
                      <CategoryDot category={c.category} />
                      {c.category}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: 'var(--em-brass-deep)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${share * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="w-6 flex-none text-right font-mono text-[0.78rem] text-muted">
                      {c.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </RevealItem>

        {/* recognised sample */}
        <RevealItem>
          <div className="h-full rounded-panel border border-hairline bg-surface p-6">
            <h3 className="mb-4 font-serif text-[1.15rem] text-bright">
              Recognised merchants
            </h3>
            <div className="flex flex-col">
              {preview.map((t, i) => (
                <div
                  key={t.id}
                  className={[
                    'flex items-center justify-between py-2.5',
                    i < preview.length - 1 ? 'border-b border-hairline' : '',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[0.86rem] text-bright">
                      <CategoryDot category={t.category} />
                      <span className="truncate">{t.merchant}</span>
                    </div>
                    <div className="ml-4 text-[0.72rem] text-faint">
                      {formatDate(t.date)} · {t.category}
                    </div>
                  </div>
                  <Money amount={t.amount} className="text-[0.86rem]" />
                </div>
              ))}
            </div>
            {headlineCount > preview.length && (
              <p className="mt-3 text-center text-[0.74rem] text-faint">
                + {headlineCount - preview.length} more on the next step
              </p>
            )}
          </div>
        </RevealItem>
      </div>

      <RevealItem>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onContinue}
            className="flex items-center gap-2.5 rounded-control bg-brass px-6 py-3 text-[0.92rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
          >
            Review &amp; categorise
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </RevealItem>
    </Reveal>
  );
}

function Cell({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
          {label}
        </span>
      </div>
      <div className="text-[0.92rem]">{children}</div>
    </div>
  );
}
