import { useMemo, useState } from 'react';
import { Trash2, RotateCcw, Search, Check } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { Money } from '../import/components/Money';
import { CategoryDot } from '../import/components/CategorySelect';
import { formatDate } from '../import/format';
import { CATEGORIES, type Category } from './types';
import { useTrash, transactionsStore, trashDaysRemaining, TRASH_RETENTION_DAYS } from './store';

type CatFilter = 'all' | Category;

/**
 * Recently Deleted — a dedicated page (not a list buried in Settings). Soft-
 * deleted transactions live here with full management: search, category filter,
 * per-row and bulk restore / permanent delete, and the days remaining before
 * each is auto-purged (30-day retention). Restoring returns an item to the
 * ledger, which instantly refreshes every derived view.
 */
export function TrashPage() {
  const trash = useTrash();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trash.filter((e) => {
      if (filter !== 'all' && e.txn.category !== filter) return false;
      if (!q) return true;
      return (
        e.txn.merchant.toLowerCase().includes(q) ||
        e.txn.description.toLowerCase().includes(q) ||
        e.txn.category.toLowerCase().includes(q)
      );
    });
  }, [trash, query, filter]);

  const catsPresent = useMemo(() => {
    const set = new Set(trash.map((e) => e.txn.category));
    return CATEGORIES.filter((c) => set.has(c));
  }, [trash]);

  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.txn.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (filtered.every((e) => next.has(e.txn.id))) filtered.forEach((e) => next.delete(e.txn.id));
      else filtered.forEach((e) => next.add(e.txn.id));
      return next;
    });

  const restoreSelected = () => {
    [...selected].forEach((id) => transactionsStore.restore(id));
    setSelected(new Set());
  };
  const purgeSelected = () => {
    [...selected].forEach((id) => transactionsStore.purge(id));
    setSelected(new Set());
  };

  return (
    <PageStage>
      <StageItem className="mb-2">
        <div className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-brass">Recently deleted</div>
        <h1 className="mt-2 font-serif text-[2rem] leading-tight text-bright">Trash</h1>
        <p className="mt-1 text-[0.9rem] text-muted">
          Deleted transactions stay here for {TRASH_RETENTION_DAYS} days, then are removed automatically.
          Restore returns them to every view instantly.
        </p>
      </StageItem>

      {trash.length === 0 ? (
        <StageItem>
          <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-hairline px-6 py-20 text-center">
            <Trash2 size={28} strokeWidth={1.4} className="mb-4 text-faint" />
            <h3 className="font-serif text-[1.3rem] text-bright">Trash is empty</h3>
            <p className="mt-1 max-w-sm text-[0.88rem] text-muted">
              When you delete a transaction it lands here, recoverable for {TRASH_RETENTION_DAYS} days.
            </p>
          </div>
        </StageItem>
      ) : (
        <>
          <StageItem className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deleted transactions…"
                className="h-10 w-full rounded-control border border-hairline bg-surface pl-10 pr-3 text-[0.88rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                All · {trash.length}
              </FilterChip>
              {catsPresent.map((c) => (
                <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
                  {c}
                </FilterChip>
              ))}
            </div>
          </StageItem>

          <StageItem>
            <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
              {/* header */}
              <div className="grid grid-cols-[28px_84px_1fr_120px_110px_88px] items-center gap-3 border-b border-hairline px-5 py-3">
                <button
                  type="button"
                  onClick={toggleAll}
                  aria-label="Select all"
                  className={[
                    'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                    allSelected ? 'border-brass bg-brass text-void' : 'border-hairline-strong',
                  ].join(' ')}
                >
                  {allSelected && <Check size={11} />}
                </button>
                <Hd>Date</Hd>
                <Hd>Merchant</Hd>
                <Hd className="text-right">Amount</Hd>
                <Hd className="text-right">Expires</Hd>
                <Hd className="text-right"> </Hd>
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-[0.86rem] text-muted">
                  No deleted transactions match {query ? `“${query}”` : 'this filter'}.
                </div>
              ) : (
                filtered.map((e) => {
                  const days = trashDaysRemaining(e.deletedAt);
                  const isSel = selected.has(e.txn.id);
                  return (
                    <div
                      key={e.txn.id}
                      className={[
                        'group grid grid-cols-[28px_84px_1fr_120px_110px_88px] items-center gap-3 border-b border-hairline px-5 py-3.5 transition-colors',
                        isSel ? 'bg-elevated' : 'hover:bg-elevated/50',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        aria-label={`Select ${e.txn.merchant}`}
                        onClick={() => toggle(e.txn.id)}
                        className={[
                          'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                          isSel ? 'border-brass bg-brass text-void' : 'border-hairline-strong',
                        ].join(' ')}
                      >
                        {isSel && <Check size={11} />}
                      </button>
                      <span className="font-mono text-[0.78rem] text-muted">{formatDate(e.txn.date)}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CategoryDot category={e.txn.category} />
                          <span className="truncate text-[0.9rem] text-bright">{e.txn.merchant}</span>
                        </div>
                        <div className="ml-4 truncate text-[0.72rem] text-faint">{e.txn.category}</div>
                      </div>
                      <Money amount={e.txn.amount} className="text-right text-[0.86rem]" />
                      <span
                        className={[
                          'text-right font-mono text-[0.72rem]',
                          days <= 3 ? 'text-loss' : 'text-faint',
                        ].join(' ')}
                      >
                        {days}d left
                      </span>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Restore ${e.txn.merchant}`}
                          onClick={() => transactionsStore.restore(e.txn.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-control text-faint transition-colors hover:bg-brass/10 hover:text-brass"
                        >
                          <RotateCcw size={13} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${e.txn.merchant} permanently`}
                          onClick={() => transactionsStore.purge(e.txn.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-control text-faint transition-colors hover:bg-loss/10 hover:text-loss"
                        >
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </StageItem>
        </>
      )}

      {/* bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-panel border border-hairline-strong bg-elevated px-5 py-3 shadow-elevated">
          <span className="text-[0.84rem] text-soft">
            <span className="font-mono text-bright">{selected.size}</span> selected
          </span>
          <div className="h-5 w-px bg-hairline" />
          <button
            type="button"
            onClick={restoreSelected}
            className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-1.5 text-[0.8rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            Restore selected
          </button>
          <button
            type="button"
            onClick={purgeSelected}
            className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-1.5 text-[0.8rem] text-loss transition-colors hover:border-loss/50"
          >
            <Trash2 size={14} strokeWidth={1.75} />
            Delete permanently
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[0.78rem] text-muted transition-colors hover:text-soft"
          >
            Clear
          </button>
        </div>
      )}
    </PageStage>
  );
}

function Hd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint ${className}`}>
      {children}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-control border px-3 py-1.5 text-[0.78rem] transition-colors',
        active ? 'border-brass bg-brass/10 text-brass' : 'border-hairline text-muted hover:text-soft',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
