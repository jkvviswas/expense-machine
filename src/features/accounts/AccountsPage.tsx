import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Archive, ArchiveRestore, CreditCard } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { formatMoneyFull } from '../import/format';
import { useLedger } from '../transactions/store';
import { useAccounts, accountsStore, computeTotalBalance, ACCOUNT_TYPES, type UserAccount, type AccountType } from './store';

export function AccountsPage() {
  const accounts = useAccounts();
  const ledger = useLedger() ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);

  // Current balance = opening balance + net of all transactions on that account.
  const balanceOf = useMemo(() => {
    const net = new Map<string, number>();
    for (const t of ledger) net.set(t.accountId, (net.get(t.accountId) ?? 0) + t.amount);
    return (a: UserAccount) => a.openingBalance + (net.get(a.id) ?? 0);
  }, [ledger]);

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const totalBalance = computeTotalBalance(ledger, accounts);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (a: UserAccount) => { setEditing(a); setOpen(true); };

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">Accounts</p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">Bank accounts</h2>
          <p className="mt-1 text-[0.9rem] text-muted">Manage the accounts your money moves through.</p>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright">
          <Plus size={16} strokeWidth={2} /> Add account
        </button>
      </StageItem>

      {accounts.length === 0 && totalBalance === 0 ? (
        <StageItem>
          <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-hairline px-6 py-20 text-center">
            <CreditCard size={28} strokeWidth={1.4} className="mb-4 text-faint" />
            <h3 className="font-serif text-[1.5rem] text-bright">No accounts yet</h3>
            <p className="mt-2 max-w-sm text-[0.9rem] text-muted">Add your first bank account, or create one automatically when you import a statement.</p>
            <button type="button" onClick={openCreate}
              className="mt-6 flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors hover:bg-brass-bright">
              <Plus size={16} strokeWidth={2} /> Add account
            </button>
          </div>
        </StageItem>
      ) : (
        <>
          <StageItem className="mb-8 rounded-panel border border-hairline bg-surface p-5">
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">Total balance across accounts</div>
            <div className="mt-1 font-num text-[1.7rem] text-bright">{formatMoneyFull(totalBalance)}</div>
            {accounts.length === 0 && (
              <p className="mt-2 text-[0.78rem] text-muted">
                From imported statement activity. Add an account to organise it.
              </p>
            )}
          </StageItem>

          {accounts.length > 0 && (
          <StageItem className="grid gap-4 lg:grid-cols-2">
            {active.map((a) => (
              <AccountCard key={a.id} account={a} balance={balanceOf(a)} onEdit={() => openEdit(a)}
                onArchive={() => accountsStore.archive(a.id, true)} onDelete={() => accountsStore.remove(a.id)} />
            ))}
          </StageItem>
          )}

          {archived.length > 0 && (
            <>
              <StageItem className="mb-3 mt-8 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Archived</StageItem>
              <StageItem className="grid gap-4 lg:grid-cols-2">
                {archived.map((a) => (
                  <AccountCard key={a.id} account={a} balance={balanceOf(a)} archived onEdit={() => openEdit(a)}
                    onArchive={() => accountsStore.archive(a.id, false)} onDelete={() => accountsStore.remove(a.id)} />
                ))}
              </StageItem>
            </>
          )}
        </>
      )}

      <AccountEditor open={open} account={editing} onClose={() => setOpen(false)} />
    </PageStage>
  );
}

function AccountCard({ account, balance, archived, onEdit, onArchive, onDelete }: {
  account: UserAccount; balance: number; archived?: boolean;
  onEdit: () => void; onArchive: () => void; onDelete: () => void;
}) {
  return (
    <div className={['rounded-panel border border-hairline bg-surface p-5', archived ? 'opacity-60' : ''].join(' ')}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-[1.05rem] text-bright">{account.name}</h3>
          <p className="font-mono text-[0.72rem] text-faint">
            {account.bank} · {account.type}{account.last4 ? ` · ••${account.last4}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} className="rounded-control px-2 py-1 text-[0.76rem] text-muted hover:text-brass">Edit</button>
          <button type="button" aria-label={archived ? 'Unarchive' : 'Archive'} onClick={onArchive}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:text-brass">
            {archived ? <ArchiveRestore size={13} strokeWidth={1.75} /> : <Archive size={13} strokeWidth={1.75} />}
          </button>
          <button type="button" aria-label="Delete account" onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-loss/10 hover:text-loss">
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">Current balance</span>
        <span className="font-num text-[1.2rem] text-bright">{formatMoneyFull(balance)}</span>
      </div>
      {account.notes && <p className="mt-2 text-[0.78rem] text-muted">{account.notes}</p>}
    </div>
  );
}

function AccountEditor({ open, account, onClose }: { open: boolean; account: UserAccount | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState<AccountType>('Savings');
  const [last4, setLast4] = useState('');
  const [opening, setOpening] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');

  const seeded = useState({ id: '' })[0];
  if (open && seeded.id !== (account?.id ?? 'new')) {
    seeded.id = account?.id ?? 'new';
    setName(account?.name ?? '');
    setBank(account?.bank ?? '');
    setType(account?.type ?? 'Savings');
    setLast4(account?.last4 ?? '');
    setOpening(account ? String(account.openingBalance) : '');
    setCurrency(account?.currency ?? 'INR');
    setNotes(account?.notes ?? '');
    setAccountId(account?.id ?? '');
  }

  const valid = name.trim() !== '' && bank.trim() !== '';
  const field = 'h-11 w-full rounded-control border border-hairline bg-ground px-3 text-[0.9rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none';
  const label = 'mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint';

  const submit = () => {
    if (!valid) return;
    const data = {
      name: name.trim(), bank: bank.trim(), type, last4: last4.trim().slice(0, 4),
      openingBalance: Number(opening) || 0, currency: currency.trim() || 'INR',
      notes: notes.trim() || undefined,
    };
    if (account) {
      accountsStore.update(account.id, data);
      // If the user edited the account ID, re-link transactions to the new id.
      const nextId = accountId.trim();
      if (nextId && nextId !== account.id) {
        accountsStore.changeId(account.id, nextId);
      }
    } else {
      accountsStore.add(data);
    }
    seeded.id = '';
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-void/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-hairline-strong bg-surface p-7 shadow-elevated"
            initial={{ opacity: 0, scale: 0.96, y: '-46%' }} animate={{ opacity: 1, scale: 1, y: '-50%' }} exit={{ opacity: 0, scale: 0.96, y: '-46%' }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-[1.4rem] text-bright">{account ? 'Edit account' : 'New account'}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:text-bright"><X size={18} /></button>
            </div>
            <div className="mb-4"><label className={label}>Account name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Savings" autoFocus className={field} /></div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Bank</label><input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. HDFC" className={field} /></div>
              <div><label className={label}>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={field}>
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Last 4 digits</label><input value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))} maxLength={4} placeholder="6021" className={field} /></div>
              <div><label className={label}>Opening balance (₹)</label><input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" className={field} /></div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Currency</label><input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className={field} /></div>
            </div>
            <div className="mb-7"><label className={label}>Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={field} /></div>
            {account && (
              <div className="mb-7">
                <label className={label}>Account ID</label>
                <input value={accountId} onChange={(e) => setAccountId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="account id" className={`${field} font-mono`} />
                <p className="mt-1.5 text-[0.72rem] text-muted">
                  Internal identifier. Changing it re-links all this account's transactions automatically. Must be unique.
                </p>
              </div>
            )}
            <button type="button" disabled={!valid} onClick={submit} className="w-full rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-40">
              {account ? 'Save changes' : 'Add account'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
