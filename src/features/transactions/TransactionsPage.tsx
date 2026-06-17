import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, SlidersHorizontal, Plus } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { Money } from '../import/components/Money';
import { FilterSelect, type Option } from './components/FilterSelect';
import { LedgerTable } from './components/LedgerTable';
import { DetailDrawer } from './components/DetailDrawer';
import { BulkBar } from './components/BulkBar';
import { LedgerSkeleton, LedgerEmpty, NoResults } from './components/States';
import { applyFilters, sortTransactions, activeFilterCount, totals, toCSV, downloadCSV } from './filters';
import { emptyFilters } from './types';
import type { Category, Transaction, FilterState } from './types';
import { accountById } from './data';
import { accountsStore, useAccounts, computeTotalBalance } from '../accounts/store';
import { useAllCategories } from './categories';
import { transactionsStore, useLedger } from './store';
import { deleteTransactionWithUndo, deleteManyWithUndo } from './actions';
import { AddTransaction } from './components/AddTransaction';

export function TransactionsPage() {
  const navigate = useNavigate();
  // Persisted working ledger (null while hydrating → show skeleton).
  const ledger = useLedger();
  const loading = ledger === null;
  const txns = useMemo(() => ledger ?? [], [ledger]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Transaction | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const userAccounts = useAccounts();
  const allCategories = useAllCategories();

  const filtered = useMemo(() => {
    // Anchor "This Month"/"Last Month"/etc to the ledger's most recent
    // activity — the same anchor the Dashboard uses (resolvePeriod via
    // latestIso) — so named date windows resolve to the same period and
    // totals stay consistent across both pages.
    const now = txns.length
      ? new Date(txns.reduce((m, t) => (t.date > m ? t.date : m), txns[0].date) + 'T00:00:00')
      : undefined;
    return sortTransactions(applyFilters(txns, filters, now), filters.sort);
  }, [txns, filters]);
  const sums = useMemo(() => totals(filtered), [filtered]);
  // Opening balance across active accounts, and the resulting current balance
  // (opening + net flow). Surfaced so Net flow + Opening + Current read together:
  // e.g. −₹20,851.22 (net) + ₹25,000 (opening) = ₹4,148.78 (current).
  const openingTotal = useMemo(
    () => userAccounts.filter((a) => !a.archived).reduce((s, a) => s + a.openingBalance, 0),
    [userAccounts],
  );
  const currentBalance = useMemo(
    () => computeTotalBalance(ledger ?? [], userAccounts),
    [ledger, userAccounts],
  );
  const filterCount = activeFilterCount(filters);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((f) => ({ ...f, [key]: value })),
    [],
  );

  const changeCategory = useCallback((id: string, next: Category) => {
    transactionsStore.setCategory(id, next);
    setActive((a) =>
      a && a.id === id ? { ...a, category: next, edited: true, confidence: 1 } : a,
    );
  }, []);

  const bulkCategory = useCallback(
    (next: Category) => {
      transactionsStore.setCategoryBulk([...selected], next);
      setSelected(new Set());
    },
    [selected],
  );

  const exportSelection = useCallback(() => {
    const chosen = filtered.filter((t) => selected.has(t.id));
    const rows = chosen.length > 0 ? chosen : filtered;
    downloadCSV('expense-machine-transactions.csv', toCSV(rows));
  }, [filtered, selected]);

  const deleteOne = useCallback((t: Transaction) => {
    deleteTransactionWithUndo(t);
    setActive((a) => (a && a.id === t.id ? null : a));
    setSelected((prev) => {
      if (!prev.has(t.id)) return prev;
      const next = new Set(prev);
      next.delete(t.id);
      return next;
    });
  }, []);

  const bulkDelete = useCallback(() => {
    deleteManyWithUndo([...selected]);
    setSelected(new Set());
  }, [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (filtered.every((t) => next.has(t.id))) {
        filtered.forEach((t) => next.delete(t.id));
      } else {
        filtered.forEach((t) => next.add(t.id));
      }
      return next;
    });
  }, [filtered]);

  const clearFilters = useCallback(() => setFilters(emptyFilters), []);

  // filter option sets
  const categoryOpts: Option<Category | 'all'>[] = [
    { value: 'all', label: 'All' },
    ...allCategories.map((c) => ({ value: c, label: c })),
  ];
  // Account options = user-created accounts + any account referenced by the
  // ledger (so imported/manual accounts always appear). Fresh install → "All".
  const accountOpts: Option<string>[] = useMemo(() => {
    const present = new Map<string, string>();
    for (const a of accountsStore.active()) present.set(a.id, a.name);
    for (const t of txns) {
      if (!present.has(t.accountId)) {
        present.set(t.accountId, accountById(t.accountId)?.label ?? t.accountId);
      }
    }
    return [
      { value: 'all', label: 'All' },
      ...[...present].map(([id, label]) => ({ value: id, label })),
    ];
  }, [txns, userAccounts]);
  const typeOpts: Option<FilterState['type']>[] = [
    { value: 'all', label: 'All' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
  ];
  const dateOpts: Option<FilterState['dateWindow']>[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];
  const sortOpts: Option<FilterState['sort']>[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amountDesc', label: 'Amount High → Low' },
    { value: 'amountAsc', label: 'Amount Low → High' },
  ];

  const noTxnsAtAll = !loading && txns.length === 0;

  return (
    <PageStage>
      {/* Title + totals strip */}
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
            Ledger
          </p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">
            Transactions
          </h2>
        </div>
        <div className="flex items-center gap-6">
          {!loading && txns.length > 0 && (
            <>
              <Totals label="Inflow" amount={sums.inflow} />
              <Totals label="Outflow" amount={sums.outflow} />
              <Totals label="Net flow" amount={sums.net} strong />
              {openingTotal !== 0 && (
                <>
                  <Totals label="Opening balance" amount={openingTotal} />
                  <Totals label="Current balance" amount={currentBalance} strong />
                </>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
          >
            <Plus size={16} strokeWidth={2} />
            Add transaction
          </button>
        </div>
      </StageItem>

      <AddTransaction
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accountOptions={accountOpts.filter((o) => o.value !== 'all').map((o) => ({ id: o.value, label: o.label }))}
      />

      {noTxnsAtAll ? (
        <StageItem>
          <LedgerEmpty onImport={() => navigate('/import')} />
        </StageItem>
      ) : (
        <>
          {/* Search + filters */}
          <StageItem className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex flex-1 items-center">
              <Search size={15} className="pointer-events-none absolute left-3.5 text-faint" />
              <input
                value={filters.query}
                onChange={(e) => setFilter('query', e.target.value)}
                placeholder="Search merchant, description or note…"
                className="h-10 w-full rounded-control border border-hairline bg-surface pl-10 pr-3 text-[0.86rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={exportSelection}
              className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
            >
              <Download size={15} strokeWidth={1.75} />
              Export
            </button>
          </StageItem>

          <StageItem className="mb-5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[0.74rem] text-faint">
              <SlidersHorizontal size={13} />
              Filters
            </span>
            <FilterSelect label="Category" value={filters.category} options={categoryOpts} defaultValue="all" onChange={(v) => setFilter('category', v)} />
            <FilterSelect label="Account" value={filters.accountId} options={accountOpts} defaultValue="all" onChange={(v) => setFilter('accountId', v)} />
            <FilterSelect label="Type" value={filters.type} options={typeOpts} defaultValue="all" onChange={(v) => setFilter('type', v)} />
            <FilterSelect label="Date" value={filters.dateWindow} options={dateOpts} defaultValue="all" onChange={(v) => setFilter('dateWindow', v)} />
            {filters.dateWindow === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-2.5">
                  <span className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">From</span>
                  <input
                    type="date"
                    aria-label="From date"
                    value={filters.customFrom ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, customFrom: e.target.value }))}
                    className="h-5 border-0 bg-transparent p-0 text-[0.82rem] text-soft focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-2.5">
                  <span className="font-mono text-[0.66rem] uppercase tracking-wider text-faint">To</span>
                  <input
                    type="date"
                    aria-label="To date"
                    value={filters.customTo ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, customTo: e.target.value }))}
                    className="h-5 border-0 bg-transparent p-0 text-[0.82rem] text-soft focus:outline-none"
                  />
                </label>
              </div>
            )}
            <FilterSelect label="Sort" value={filters.sort} options={sortOpts} defaultValue="newest" onChange={(v) => setFilter('sort', v)} />
            {filterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[0.78rem] text-muted underline-offset-2 transition-colors hover:text-soft hover:underline"
              >
                Clear ({filterCount})
              </button>
            )}
            <span className="ml-auto text-[0.74rem] text-faint">
              {filtered.length} of {txns.length}
            </span>
          </StageItem>

          {/* Body: loading / no-results / table */}
          <StageItem>
            {loading ? (
              <LedgerSkeleton />
            ) : filtered.length === 0 ? (
              <NoResults onClear={clearFilters} />
            ) : (
              <LedgerTable
                transactions={filtered}
                selected={selected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                allSelected={allSelected}
                onOpen={setActive}
                onDelete={deleteOne}
              />
            )}
          </StageItem>
        </>
      )}

      <DetailDrawer
        transaction={active}
        onClose={() => setActive(null)}
        onChangeCategory={changeCategory}
        onDelete={deleteOne}
      />

      <BulkBar
        count={selected.size}
        onSetCategory={bulkCategory}
        onExport={exportSelection}
        onDelete={bulkDelete}
        onClear={() => setSelected(new Set())}
      />
    </PageStage>
  );
}

function Totals({
  label,
  amount,
  strong,
}: {
  label: string;
  amount: number;
  strong?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="mb-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">
        {label}
      </div>
      <Money amount={amount} className={strong ? 'text-[1.05rem]' : 'text-[0.95rem]'} />
    </div>
  );
}
