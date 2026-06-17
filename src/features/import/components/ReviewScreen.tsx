import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Check,
  Sparkles,
  ArrowRight,
  ListFilter,
  Store,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { Reveal, RevealItem } from './Reveal';
import { Money } from './Money';
import { CategorySelect, CategoryDot } from './CategorySelect';
import { DuplicateReview } from './DuplicateReview';
import { computeTotals } from '../mockData';
import { formatDate, formatMoneyFull, confidenceBand } from '../format';
import { detectReversals } from '../parsing/reversals';
import type { ExtractionSummary } from '../parsing/summary';
import type { DuplicateMatch } from '../parsing/duplicates';
import { CATEGORIES, type Category, type ParsedTransaction } from '../types';
import { useAllCategories } from '../../transactions/categories';

interface ReviewScreenProps {
  transactions: ParsedTransaction[];
  summary: ExtractionSummary;
  duplicates: DuplicateMatch[];
  excluded: Set<string>;
  onToggleExcluded: (t: ParsedTransaction) => void;
  onSkipAllDuplicates: () => void;
  onKeepAllDuplicates: () => void;
  onChangeCategory: (id: string, next: Category) => void;
  onBulkCategory: (ids: string[], next: Category) => void;
  onConfirm: () => void;
}

type FilterValue = 'all' | 'review' | Category;

export function ReviewScreen({
  transactions,
  summary,
  duplicates,
  excluded,
  onToggleExcluded,
  onSkipAllDuplicates,
  onKeepAllDuplicates,
  onChangeCategory,
  onBulkCategory,
  onConfirm,
}: ReviewScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Refund/reversal pairs within this import — used to label matched credits.
  const reversalCredits = useMemo(() => {
    const scan = detectReversals(transactions);
    return new Set([...scan.matches.keys()]);
  }, [transactions]);

  const totals = computeTotals(transactions);
  // How many will actually be committed (excluded duplicates are skipped).
  const commitCount = transactions.filter((t) => !excluded.has(t.id)).length;
  // Live counts recomputed from current categories (edits reduce these).
  const needsReview = transactions.filter(
    (t) => !t.edited && (t.confidence < 0.7 || t.category === 'Uncategorized'),
  ).length;
  const confidencePct = Math.round(summary.confidence * 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter === 'review' && t.confidence >= 0.7) return false;
      if (filter !== 'all' && filter !== 'review' && t.category !== filter)
        return false;
      if (!q) return true;
      return (
        t.merchant.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [transactions, query, filter]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((t) => next.delete(t.id));
      } else {
        filtered.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Base set for counting: everything matching the current search query (but
  // NOT the active chip), so each chip shows how many rows IT would yield.
  // This keeps counts dynamic and never contradictory with the visible table.
  const searchMatched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.merchant.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [transactions, query]);

  const countFor = (value: FilterValue): number => {
    if (value === 'all') return searchMatched.length;
    if (value === 'review')
      return searchMatched.filter((t) => t.confidence < 0.7).length;
    return searchMatched.filter((t) => t.category === value).length;
  };

  const filters: { value: FilterValue; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: countFor('all') },
    { value: 'review', label: 'Needs review', count: countFor('review') },
    // Only surface category chips that actually have matching rows, so a chip
    // can never show while yielding an empty, unexplained table.
    ...CATEGORIES.filter((c) => countFor(c as FilterValue) > 0).map((c) => ({
      value: c as FilterValue,
      label: c,
      count: countFor(c as FilterValue),
    })),
  ];

  return (
    <Reveal className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* ---- Main: table ---- */}
      <div className="min-w-0">
        <RevealItem>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex flex-1 items-center">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 text-faint"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search merchant or description…"
                className="h-10 w-full rounded-control border border-hairline bg-surface pl-10 pr-3 text-[0.86rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
              />
            </label>
            <div className="flex items-center gap-2 text-[0.74rem] text-faint">
              <ListFilter size={14} />
              {filtered.length} shown
            </div>
          </div>
        </RevealItem>

        {/* filter chips */}
        <RevealItem>
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={[
                    'rounded-full border px-3 py-1 text-[0.76rem] transition-colors duration-300 ease-lux',
                    active
                      ? 'border-brass-deep bg-brass-deep/25 text-brass'
                      : 'border-hairline text-muted hover:text-soft',
                  ].join(' ')}
                >
                  {f.label}
                  <span className={active ? 'text-brass/70' : 'text-faint'}> · {f.count}</span>
                </button>
              );
            })}
          </div>
        </RevealItem>

        {/* table */}
        <RevealItem>
          <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
            {/* header row */}
            <div className="grid grid-cols-[28px_1fr_120px_110px] items-center gap-3 border-b border-hairline px-4 py-2.5 sm:grid-cols-[28px_1fr_170px_120px]">
              <button
                type="button"
                onClick={toggleAll}
                aria-label="Select all"
                className={[
                  'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                  allVisibleSelected
                    ? 'border-brass bg-brass text-void'
                    : 'border-hairline-strong',
                ].join(' ')}
              >
                {allVisibleSelected && <Check size={11} />}
              </button>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
                Transaction
              </span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
                Category
              </span>
              <span className="text-right font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
                Amount
              </span>
            </div>

            {/* rows */}
            <div className="max-h-[520px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <p className="text-[0.86rem] text-muted">
                    {query
                      ? `No transactions match “${query}”${filter !== 'all' ? ` in ${filter === 'review' ? 'Needs review' : filter}` : ''}.`
                      : filter === 'review'
                        ? 'Nothing needs review — every row is confidently categorized.'
                        : `No ${filter} transactions in this statement.`}
                  </p>
                  {(query || filter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); setFilter('all'); }}
                      className="text-[0.78rem] text-brass transition-colors hover:text-brass-bright"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((t) => {
                  const band = confidenceBand(t.confidence);
                  const isSel = selected.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={[
                        'grid grid-cols-[28px_1fr_120px_110px] items-center gap-3 border-b border-hairline px-4 py-3 transition-colors sm:grid-cols-[28px_1fr_170px_120px]',
                        isSel ? 'bg-elevated' : 'hover:bg-elevated/50',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleOne(t.id)}
                        aria-label={`Select ${t.merchant}`}
                        className={[
                          'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                          isSel
                            ? 'border-brass bg-brass text-void'
                            : 'border-hairline-strong',
                        ].join(' ')}
                      >
                        {isSel && <Check size={11} />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[0.88rem] text-bright">
                            {t.merchant}
                          </span>
                          {reversalCredits.has(t.id) && (
                            <span
                              className="inline-flex flex-none items-center rounded-full border border-gain/40 bg-gain/10 px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-gain"
                              title="Matched to an earlier debit — a refund or reversal."
                            >
                              Refund
                            </span>
                          )}
                          {!t.edited && (
                            <span
                              className="hidden items-center gap-1 font-mono text-[0.58rem] uppercase tracking-wider sm:inline-flex"
                              style={{ color: band.tone }}
                              title={`Confidence: ${Math.round(t.confidence * 100)}%`}
                            >
                              <Sparkles size={9} />
                              {band.label}
                            </span>
                          )}
                          {t.edited && (
                            <span className="hidden font-mono text-[0.58rem] uppercase tracking-wider text-muted sm:inline">
                              edited
                            </span>
                          )}
                        </div>
                        <div className="text-[0.72rem] text-faint">
                          {formatDate(t.date)} · {t.description}
                        </div>
                      </div>

                      <CategorySelect
                        value={t.category}
                        onChange={(next) => onChangeCategory(t.id, next)}
                      />

                      <Money amount={t.amount} className="text-right text-[0.86rem]" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </RevealItem>
      </div>

      {/* ---- Right: live summary + bulk ---- */}
      <div className="flex flex-col gap-5">
        {/* Import summary + confidence + commit */}
        <RevealItem>
          <div className="rounded-panel border border-hairline bg-surface p-6">
            <h3 className="mb-5 font-serif text-[1.2rem] text-bright">
              Import summary
            </h3>
            <dl className="flex flex-col gap-4">
              <SummaryRow label="Transactions" value={String(totals.count)} />
              <SummaryRow label="Total inflow" value={formatMoneyFull(totals.inflow)} tone="gain" />
              <SummaryRow label="Total outflow" value={formatMoneyFull(totals.outflow)} tone="loss" />
              <div className="my-1 h-px bg-hairline" />
              <SummaryRow label="Net change" value={formatMoneyFull(totals.net)} tone={totals.net >= 0 ? 'gain' : 'loss'} strong />
            </dl>

            {/* Categorization confidence */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
                  <ShieldCheck size={12} strokeWidth={1.75} className="text-brass" />
                  Categorization confidence
                </span>
                <span className="font-num text-[0.84rem] text-bright">
                  {confidencePct}%
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'var(--em-brass)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePct}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            {needsReview > 0 && (
              <div className="mt-5 rounded-control border border-hairline bg-elevated px-4 py-3">
                <p className="text-[0.78rem] leading-snug text-soft">
                  <span className="text-brass">{needsReview}</span> transaction
                  {needsReview > 1 ? 's' : ''} flagged for a quick look. Filter by{' '}
                  <button
                    onClick={() => setFilter('review')}
                    className="text-brass underline-offset-2 hover:underline"
                  >
                    Needs review
                  </button>
                  .
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onConfirm}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-control bg-brass px-5 py-3 text-[0.9rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
            >
              Import {commitCount} transaction{commitCount === 1 ? '' : 's'}
              <ArrowRight size={16} strokeWidth={2} />
            </button>
            {commitCount < totals.count && (
              <p className="mt-2 text-center text-[0.72rem] text-faint">
                {totals.count - commitCount} duplicate
                {totals.count - commitCount > 1 ? 's' : ''} will be skipped
              </p>
            )}
          </div>
        </RevealItem>

        {/* Duplicate review */}
        {duplicates.length > 0 && (
          <RevealItem>
            <DuplicateReview
              duplicates={duplicates}
              excluded={excluded}
              onToggle={onToggleExcluded}
              onSkipAll={onSkipAllDuplicates}
              onKeepAll={onKeepAllDuplicates}
            />
          </RevealItem>
        )}

        {/* Category breakdown */}
        {summary.categoryBreakdown.length > 0 && (
          <RevealItem>
            <div className="rounded-panel border border-hairline bg-surface p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <Sparkles size={15} strokeWidth={1.75} className="text-brass" />
                <h3 className="font-serif text-[1.05rem] text-bright">
                  Where it goes
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {summary.categoryBreakdown.slice(0, 6).map((c) => {
                  const max = Math.max(
                    1,
                    ...summary.categoryBreakdown.map((x) => x.count),
                  );
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="flex w-24 flex-none items-center gap-2 text-[0.8rem] text-soft">
                        <CategoryDot category={c.category} />
                        <span className="truncate">{c.category}</span>
                      </span>
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: 'var(--em-brass-deep)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(c.count / max) * 100}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="w-5 flex-none text-right font-mono text-[0.74rem] text-muted">
                        {c.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </RevealItem>
        )}

        {/* Top merchants */}
        {summary.topMerchants.length > 0 && (
          <RevealItem>
            <div className="rounded-panel border border-hairline bg-surface p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <Store size={15} strokeWidth={1.75} className="text-brass" />
                <h3 className="font-serif text-[1.05rem] text-bright">
                  Top merchants
                </h3>
              </div>
              <div className="flex flex-col">
                {summary.topMerchants.map((m, i) => (
                  <div
                    key={m.merchant}
                    className={[
                      'flex items-center justify-between py-2',
                      i < summary.topMerchants.length - 1
                        ? 'border-b border-hairline'
                        : '',
                    ].join(' ')}
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate text-[0.82rem] text-bright">
                        {m.merchant}
                      </span>
                      <span className="flex-none font-mono text-[0.66rem] text-faint">
                        ×{m.count}
                      </span>
                    </div>
                    <Money amount={m.total} className="text-[0.8rem]" />
                  </div>
                ))}
              </div>
            </div>
          </RevealItem>
        )}

        {/* Unrecognized transactions */}
        {summary.needsReview.length > 0 && (
          <RevealItem>
            <div className="rounded-panel border border-hairline bg-surface p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <HelpCircle size={15} strokeWidth={1.75} className="text-loss" />
                <h3 className="font-serif text-[1.05rem] text-bright">
                  Needs a look
                </h3>
              </div>
              <p className="mb-4 text-[0.78rem] leading-snug text-muted">
                {summary.needsReview.length} transaction
                {summary.needsReview.length > 1 ? 's' : ''} couldn’t be
                confidently categorised. A quick review keeps your numbers
                clean.
              </p>
              <div className="flex flex-col gap-2">
                {summary.needsReview.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-control border border-hairline bg-elevated px-3 py-2"
                  >
                    <span className="truncate text-[0.78rem] text-soft">
                      {t.merchant}
                    </span>
                    <span className="flex-none font-mono text-[0.62rem] uppercase tracking-wider text-faint">
                      {formatDate(t.date)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFilter('review')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-control border border-hairline bg-surface px-4 py-2.5 text-[0.82rem] text-soft transition-colors duration-300 ease-lux hover:border-brass-deep hover:text-bright"
              >
                Review these
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </RevealItem>
        )}
      </div>

      {/* ---- Bulk action bar ---- */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-panel border border-hairline-strong bg-elevated px-5 py-3 shadow-elevated"
          >
            <span className="text-[0.84rem] text-soft">
              <span className="font-mono text-bright">{selected.size}</span>{' '}
              selected
            </span>
            <div className="h-5 w-px bg-hairline" />
            <div className="flex items-center gap-2">
              <span className="text-[0.78rem] text-faint">Set category</span>
              <BulkCategory
                onPick={(c) => {
                  onBulkCategory([...selected], c);
                  setSelected(new Set());
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-[0.78rem] text-muted transition-colors hover:text-soft"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: 'gain' | 'loss';
  strong?: boolean;
}) {
  const toneClass =
    tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : 'text-bright';
  return (
    <div className="flex items-center justify-between">
      <dt className={`text-[0.84rem] ${strong ? 'text-soft' : 'text-muted'}`}>
        {label}
      </dt>
      <dd
        className={`font-num ${strong ? 'text-[1rem]' : 'text-[0.9rem]'} ${toneClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

function BulkCategory({ onPick }: { onPick: (c: Category) => void }) {
  const [open, setOpen] = useState(false);
  const allCategories = useAllCategories();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-control border border-hairline bg-surface px-3 py-1.5 text-[0.8rem] text-soft transition-colors hover:border-brass-deep"
      >
        Choose…
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-0 z-50 mb-2 w-44 overflow-hidden rounded-control border border-hairline bg-elevated shadow-elevated"
          >
            {allCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.82rem] text-soft transition-colors hover:bg-surface"
              >
                <CategoryDot category={c} />
                {c}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
