import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { useLedger } from '../transactions/store';
import type { Category } from '../transactions/types';
import { useBudgets, budgetStore } from './store';
import {
  categoryBudgets,
  budgetOverview,
  categoryTransactions,
  type CategoryBudget,
} from './derive';
import { BudgetOverview } from './components/BudgetOverview';
import { CategoryBudgetCard } from './components/CategoryBudgetCard';
import { BudgetDetail } from './components/BudgetDetail';
import { BudgetEditor } from './components/BudgetEditor';

export function BudgetsPage() {
  const ledger = useLedger();
  const caps = useBudgets();
  const loading = ledger === null;
  const txns = ledger ?? [];

  const [detail, setDetail] = useState<CategoryBudget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryBudget | null>(null);

  // Anchor budget figures to the ledger's most recent activity month, matching
  // Dashboard/Reports/Analytics — so an off-month import never shows ₹0 here.
  const ref = useMemo(
    () =>
      txns.length
        ? new Date(txns.reduce((m, t) => (t.date > m ? t.date : m), txns[0].date) + 'T00:00:00')
        : undefined,
    [txns],
  );

  const rows = useMemo(() => categoryBudgets(txns, caps, ref), [txns, caps, ref]);
  const overview = useMemo(() => budgetOverview(rows), [rows]);
  const taken = useMemo(() => rows.map((r) => r.category), [rows]);

  // keep the open detail in sync with live recompute
  const liveDetail = useMemo(
    () => (detail ? rows.find((r) => r.category === detail.category) ?? null : null),
    [detail, rows],
  );

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (b: CategoryBudget) => {
    setEditing(b);
    setEditorOpen(true);
  };
  const saveBudget = (category: Category, amount: number) => {
    budgetStore.setCap(category, amount);
    setEditorOpen(false);
  };
  const removeBudget = (category: Category) => {
    budgetStore.removeCap(category);
    setEditorOpen(false);
    setDetail(null);
  };

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
            Planning
          </p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">Budgets</h2>
          <p className="mt-1 text-[0.9rem] text-muted">
            Set monthly intentions by category. Every figure is measured against your real ledger.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
        >
          <Plus size={16} strokeWidth={2} />
          New budget
        </button>
      </StageItem>

      {!loading && rows.length === 0 && (
        <StageItem>
          <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-hairline px-6 py-20 text-center">
            <h3 className="font-serif text-[1.5rem] text-bright">No budgets created yet</h3>
            <p className="mt-2 max-w-sm text-[0.9rem] text-muted">
              Create your first budget to start tracking spending limits.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-6 flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
            >
              <Plus size={16} strokeWidth={2} />
              Create budget
            </button>
          </div>
        </StageItem>
      )}

      {!loading && rows.length > 0 && (
        <>
          <StageItem className="mb-8">
            <BudgetOverview overview={overview} />
          </StageItem>

          <StageItem className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
            Category budgets
          </StageItem>
          <StageItem className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((b) => (
              <CategoryBudgetCard
                key={b.category}
                budget={b}
                onOpen={setDetail}
                onEdit={openEdit}
                onDelete={(c) => removeBudget(c.category)}
              />
            ))}
          </StageItem>
        </>
      )}

      <BudgetDetail
        budget={liveDetail}
        transactions={liveDetail ? categoryTransactions(txns, liveDetail.category, ref) : []}
        onClose={() => setDetail(null)}
        onEdit={(b) => {
          setDetail(null);
          openEdit(b);
        }}
      />

      <BudgetEditor
        open={editorOpen}
        initialCategory={editing?.category ?? null}
        initialAmount={editing?.cap}
        takenCategories={taken}
        onClose={() => setEditorOpen(false)}
        onSave={saveBudget}
        onRemove={removeBudget}
      />
    </PageStage>
  );
}
