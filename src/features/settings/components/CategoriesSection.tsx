import { useState } from 'react';
import { Plus, Trash2, Archive, ArchiveRestore, Pencil, Check, X } from 'lucide-react';
import { categoriesStore } from '../../transactions/categories';
import { useSyncExternalStore } from 'react';
import { transactionsStore } from '../../transactions/store';
import { merchantRules } from '../../transactions/merchantRules';
import { budgetStore } from '../../budgets/store';
import { toneFor } from '../../import/format';
import type { Category } from '../../transactions/types';

/** Move every transaction, merchant rule, and budget cap from `from` -> `to`. */
function migrateCategory(from: string, to: Category) {
  transactionsStore.get().forEach((t) => {
    if (t.category === from) transactionsStore.patch(t.id, { category: to });
  });
  Object.entries(merchantRules.all()).forEach(([merchant, cat]) => {
    if (cat === from) merchantRules.set(merchant, to);
  });
  const caps = budgetStore.getCaps();
  const fromCap = caps[from as Category];
  if (fromCap != null) {
    budgetStore.removeCap(from as Category);
    if (caps[to] == null) budgetStore.setCap(to, fromCap);
  }
}

function useCustom() {
  return useSyncExternalStore(categoriesStore.subscribe, categoriesStore.custom, categoriesStore.custom);
}

/**
 * Category management. Users add/edit/archive/delete custom categories. They
 * appear everywhere the built-ins do (selectors, filters, budgets, reports,
 * analytics, search). Deleting reassigns any affected transactions to
 * 'Uncategorized' so the ledger is never corrupted.
 */
export function CategoriesSection() {
  const custom = useCustom();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    if (!newName.trim()) return;
    if (!categoriesStore.add(newName)) { setError('That category already exists.'); return; }
    setNewName(''); setError('');
  };

  const saveEdit = (oldName: string) => {
    if (editValue.trim() && editValue.trim() !== oldName) {
      const trimmed = editValue.trim();
      if (!categoriesStore.rename(oldName, trimmed)) { setError('That name is taken.'); return; }
      migrateCategory(oldName, trimmed as Category);
    }
    setEditing(null); setError('');
  };

  // ---- Delete confirmation modal ----
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteReplacement, setDeleteReplacement] = useState<string>('Uncategorized');
  const allCatsForDelete = categoriesStore.all().filter((c) => c !== deleteTarget);

  const requestRemove = (name: string) => {
    const affected = transactionsStore.get().filter((t) => t.category === name).length;
    if (affected === 0) {
      categoriesStore.remove(name);
      return;
    }
    setDeleteReplacement('Uncategorized');
    setDeleteTarget(name);
  };

  const confirmRemove = () => {
    if (!deleteTarget) return;
    migrateCategory(deleteTarget, deleteReplacement as Category);
    categoriesStore.remove(deleteTarget);
    setDeleteTarget(null);
  };

  const affectedCount = deleteTarget
    ? transactionsStore.get().filter((t) => t.category === deleteTarget).length
    : 0;

  // ---- Category merge (Phase 11): move all of `source` into `target` ----
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const allCats = categoriesStore.all();

  const doMerge = () => {
    setError('');
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) {
      setError('Pick two different categories to merge.');
      return;
    }
    // Migrate every transaction, merchant rule, and budget cap to the target.
    migrateCategory(mergeFrom, mergeTo as Category);
    // Remove the source if it is a custom category (built-ins are preserved).
    if (custom.some((c) => c.name === mergeFrom)) categoriesStore.remove(mergeFrom);
    setMergeFrom(''); setMergeTo('');
  };

  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <h2 className="font-serif text-[1.2rem] text-bright">Categories</h2>
      <p className="mb-4 mt-1 text-[0.82rem] text-muted">
        Create your own categories. They appear across transactions, budgets, reports and analytics.
        Deleting a category moves its transactions to Uncategorized.
      </p>

      <div className="mb-5 flex gap-2">
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New category name…"
          className="h-10 flex-1 rounded-control border border-hairline bg-ground px-3 text-[0.88rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
        />
        <button type="button" onClick={add}
          className="flex items-center gap-2 rounded-control bg-brass px-4 text-[0.84rem] font-medium text-void transition-colors hover:bg-brass-bright">
          <Plus size={15} strokeWidth={2} /> Add
        </button>
      </div>
      {error && <p className="mb-3 text-[0.78rem] text-loss">{error}</p>}

      {custom.length === 0 ? (
        <p className="text-[0.84rem] text-faint">No custom categories yet.</p>
      ) : (
        <div className="flex flex-col">
          {custom.map((c, i) => (
            <div key={c.name} className={['flex items-center gap-3 py-2.5', i > 0 ? 'border-t border-hairline' : ''].join(' ')}>
              <span className="inline-block h-2 w-2 flex-none rounded-full" style={{ background: toneFor(c.name) }} />
              {editing === c.name ? (
                <>
                  <input value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus
                    className="h-8 flex-1 rounded-control border border-hairline bg-ground px-2 text-[0.85rem] text-bright focus:border-brass focus:outline-none" />
                  <button type="button" aria-label="Save" onClick={() => saveEdit(c.name)} className="flex h-7 w-7 items-center justify-center rounded-control text-gain hover:bg-gain/10"><Check size={14} /></button>
                  <button type="button" aria-label="Cancel" onClick={() => setEditing(null)} className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-bright"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className={['flex-1 text-[0.88rem]', c.archived ? 'text-faint line-through' : 'text-bright'].join(' ')}>{c.name}</span>
                  <button type="button" aria-label="Rename" onClick={() => { setEditing(c.name); setEditValue(c.name); }} className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-brass"><Pencil size={13} /></button>
                  <button type="button" aria-label={c.archived ? 'Restore' : 'Archive'} onClick={() => categoriesStore.archive(c.name, !c.archived)} className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-brass">
                    {c.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                  </button>
                  <button type="button" aria-label="Delete" onClick={() => requestRemove(c.name)} className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-loss/10 hover:text-loss"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Merge categories (Phase 11) */}
      <div className="mt-6 border-t border-hairline pt-5">
        <h3 className="text-[0.95rem] text-bright">Merge categories</h3>
        <p className="mb-3 mt-1 text-[0.8rem] text-muted">
          Move every transaction from one category into another. The source category is removed if it's custom.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mergeFrom}
            onChange={(e) => { setMergeFrom(e.target.value); setError(''); }}
            aria-label="Merge from"
            className="h-10 rounded-control border border-hairline bg-ground px-3 text-[0.85rem] text-bright focus:border-brass focus:outline-none"
          >
            <option value="">Merge from…</option>
            {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-muted">→</span>
          <select
            value={mergeTo}
            onChange={(e) => { setMergeTo(e.target.value); setError(''); }}
            aria-label="Merge into"
            className="h-10 rounded-control border border-hairline bg-ground px-3 text-[0.85rem] text-bright focus:border-brass focus:outline-none"
          >
            <option value="">Merge into…</option>
            {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            onClick={doMerge}
            disabled={!mergeFrom || !mergeTo || mergeFrom === mergeTo}
            className="h-10 rounded-control bg-brass px-4 text-[0.84rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-40"
          >
            Merge
          </button>
        </div>
      </div>

      {/* Delete confirmation modal — shown only when the category has transactions */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-panel border border-hairline bg-elevated p-5">
            <h3 className="font-serif text-[1.05rem] text-bright">Delete "{deleteTarget}"?</h3>
            <p className="mt-2 text-[0.84rem] text-muted">
              This category is used by {affectedCount} transaction{affectedCount === 1 ? '' : 's'}.
              Choose where to move {affectedCount === 1 ? 'it' : 'them'} before deleting.
            </p>
            <select
              value={deleteReplacement}
              onChange={(e) => setDeleteReplacement(e.target.value)}
              aria-label="Move transactions to"
              className="mt-4 h-10 w-full rounded-control border border-hairline bg-ground px-3 text-[0.85rem] text-bright focus:border-brass focus:outline-none"
            >
              {allCatsForDelete.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="h-9 rounded-control border border-hairline px-4 text-[0.84rem] text-soft hover:border-brass-deep">
                Cancel
              </button>
              <button type="button" onClick={confirmRemove}
                className="h-9 rounded-control bg-loss px-4 text-[0.84rem] font-medium text-void hover:opacity-90">
                Move &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
