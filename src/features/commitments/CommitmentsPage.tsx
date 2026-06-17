import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, CalendarClock, Check } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { formatMoneyFull, formatDate } from '../import/format';
import { CategorySelect } from '../import/components/CategorySelect';
import { useCommitments, commitmentsStore, COMMITMENT_KINDS, type Commitment, type CommitmentKind } from './store';
import { markCommitmentPaid } from './actions';
import { useAccounts } from '../accounts/store';
import type { Category } from '../transactions/types';

function daysUntil(iso: string): number {
  const d = new Date(iso + 'T00:00:00').getTime();
  const now = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime();
  return Math.round((d - now) / 86_400_000);
}

export function CommitmentsPage() {
  const commitments = useCommitments();
  const accounts = useAccounts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);

  const monthlyTotal = commitments.reduce((s, c) => s + c.amount, 0);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Commitment) => { setEditing(c); setOpen(true); };

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">Planning</p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">Upcoming commitments</h2>
          <p className="mt-1 text-[0.9rem] text-muted">Rent, EMIs, insurance, subscriptions and more. Loan EMIs appear automatically.</p>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright">
          <Plus size={16} strokeWidth={2} /> New commitment
        </button>
      </StageItem>

      {commitments.length === 0 ? (
        <StageItem>
          <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-hairline px-6 py-20 text-center">
            <CalendarClock size={28} strokeWidth={1.4} className="mb-4 text-faint" />
            <h3 className="font-serif text-[1.5rem] text-bright">No commitments yet</h3>
            <p className="mt-2 max-w-sm text-[0.9rem] text-muted">Add recurring obligations to plan ahead. Loan EMIs show up here automatically.</p>
            <button type="button" onClick={openCreate}
              className="mt-6 flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors hover:bg-brass-bright">
              <Plus size={16} strokeWidth={2} /> Add commitment
            </button>
          </div>
        </StageItem>
      ) : (
        <>
          <StageItem className="mb-8 rounded-panel border border-hairline bg-surface p-5">
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">Monthly commitments</div>
            <div className="mt-1 font-num text-[1.7rem] text-bright">{formatMoneyFull(monthlyTotal)}</div>
          </StageItem>

          <StageItem className="overflow-hidden rounded-panel border border-hairline bg-surface">
            {commitments.map((c, i) => {
              const days = daysUntil(c.dueDate);
              const soon = days <= 7;
              return (
                <div key={c.id} className={['flex items-center gap-4 px-5 py-4', i > 0 ? 'border-t border-hairline' : ''].join(' ')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.92rem] text-bright">{c.name}</span>
                      <span className="rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-faint">{c.kind}</span>
                      {c.loanId && <span className="rounded-full border border-brass-deep/40 px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-brass">auto</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-[0.72rem] text-faint">
                      Due {formatDate(c.dueDate)} · <span className={soon ? 'text-watch' : ''}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`}</span>
                    </div>
                  </div>
                  <span className="font-num text-[0.95rem] text-bright">{formatMoneyFull(c.amount)}</span>
                  <button type="button" onClick={() => markCommitmentPaid(c, accounts[0]?.id)}
                    className="flex items-center gap-1.5 rounded-control border border-hairline px-2.5 py-1.5 text-[0.78rem] text-gain transition-colors hover:border-gain/50">
                    <Check size={13} strokeWidth={2} /> Mark paid
                  </button>
                  {!c.loanId && (
                    <>
                      <button type="button" onClick={() => openEdit(c)} className="rounded-control px-2 py-1 text-[0.76rem] text-muted hover:text-brass">Edit</button>
                      <button type="button" aria-label="Delete commitment" onClick={() => commitmentsStore.remove(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-loss/10 hover:text-loss">
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </StageItem>
        </>
      )}

      <CommitmentEditor open={open} commitment={editing} onClose={() => setOpen(false)} />
    </PageStage>
  );
}

function CommitmentEditor({ open, commitment, onClose }: { open: boolean; commitment: Commitment | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CommitmentKind>('Rent');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<Category>('Uncategorized');

  const seeded = useState({ id: '' })[0];
  if (open && seeded.id !== (commitment?.id ?? 'new')) {
    seeded.id = commitment?.id ?? 'new';
    setName(commitment?.name ?? '');
    setKind(commitment?.kind ?? 'Rent');
    setAmount(commitment ? String(commitment.amount) : '');
    setDueDate(commitment?.dueDate ?? new Date().toISOString().slice(0, 10));
    setCategory(commitment?.category ?? 'Uncategorized');
  }

  const valid = name.trim() !== '' && Number(amount) > 0;
  const field = 'h-11 w-full rounded-control border border-hairline bg-ground px-3 text-[0.9rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none';
  const label = 'mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint';

  const submit = () => {
    if (!valid) return;
    const data = { name: name.trim(), kind, amount: Number(amount), dueDate, category };
    if (commitment) commitmentsStore.update(commitment.id, data);
    else commitmentsStore.add(data);
    seeded.id = '';
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-void/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-hairline-strong bg-surface p-7 shadow-elevated"
            initial={{ opacity: 0, scale: 0.96, y: '-46%' }} animate={{ opacity: 1, scale: 1, y: '-50%' }} exit={{ opacity: 0, scale: 0.96, y: '-46%' }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-[1.4rem] text-bright">{commitment ? 'Edit commitment' : 'New commitment'}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:text-bright"><X size={18} /></button>
            </div>
            <div className="mb-4"><label className={label}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apartment rent" autoFocus className={field} /></div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Kind</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as CommitmentKind)} className={field}>
                  {COMMITMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div><label className={label}>Amount (₹)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={field} /></div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Next due</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} /></div>
              <div><label className={label}>Category</label><CategorySelect value={category} onChange={setCategory} /></div>
            </div>
            <button type="button" disabled={!valid} onClick={submit} className="mt-3 w-full rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-40">
              {commitment ? 'Save changes' : 'Add commitment'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
