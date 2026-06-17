import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Landmark, CheckCircle2 } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { formatMoneyFull, formatDate } from '../import/format';
import { useLoans, loansStore, LOAN_TYPES, loanStatus, type Loan, type LoanType } from './store';
import { useAccounts } from '../accounts/store';
import { useLedger } from '../transactions/store';
import type { Transaction } from '../transactions/types';
import type { Commitment } from '../commitments/store';
import { useCommitments } from '../commitments/store';
import { Money } from '../import/components/Money';

export function LoansPage() {
  const loans = useLoans();
  const ledger = useLedger() ?? [];
  const commitments = useCommitments();
  const accounts = useAccounts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [detail, setDetail] = useState<Loan | null>(null);

  const active = loans.filter((l) => loanStatus(l) === 'Active');
  const cleared = loans.filter((l) => loanStatus(l) !== 'Active');
  const totalOutstanding = loans.reduce((s, l) => s + Math.max(0, l.remaining), 0);
  const totalPaid = loans.reduce((s, l) => s + Math.max(0, l.principal - l.remaining), 0);
  const totalEmi = active.reduce((s, l) => s + l.emi, 0);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (l: Loan) => { setEditing(l); setOpen(true); };

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">Liabilities</p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">Loans</h2>
          <p className="mt-1 text-[0.9rem] text-muted">Track loans, EMIs, principal paid down, and remaining balances.</p>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright">
          <Plus size={16} strokeWidth={2} /> New loan
        </button>
      </StageItem>

      {loans.length === 0 ? (
        <StageItem>
          <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-hairline px-6 py-20 text-center">
            <Landmark size={28} strokeWidth={1.4} className="mb-4 text-faint" />
            <h3 className="font-serif text-[1.5rem] text-bright">No loans tracked yet</h3>
            <p className="mt-2 max-w-sm text-[0.9rem] text-muted">Add a loan to track its EMI, interest, and how much principal you've paid down.</p>
            <button type="button" onClick={openCreate}
              className="mt-6 flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors hover:bg-brass-bright">
              <Plus size={16} strokeWidth={2} /> Add loan
            </button>
          </div>
        </StageItem>
      ) : (
        <>
          <StageItem className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Total outstanding principal" value={formatMoneyFull(totalOutstanding)} />
            <Stat label="Total paid principal" value={formatMoneyFull(totalPaid)} />
            <Stat label="Total monthly EMI" value={formatMoneyFull(totalEmi)} />
            <Stat label="Active loans" value={String(active.length)} />
            <Stat label="Principal cleared loans" value={String(cleared.length)} />
          </StageItem>
          <StageItem className="grid gap-4 lg:grid-cols-2">
            {loans.map((l) => {
              const paid = Math.max(0, l.principal - l.remaining);
              const progress = l.principal > 0 ? Math.min(1, paid / l.principal) : 0;
              const status = loanStatus(l);
              const clearedOrClosed = status !== 'Active';
              return (
                <div key={l.id}
                  onClick={() => setDetail(l)}
                  className="group cursor-pointer rounded-panel border border-hairline bg-surface p-5 transition-colors hover:border-brass-deep">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-[1.05rem] text-bright">{l.name}</h3>
                      <p className="font-mono text-[0.72rem] text-faint">
                        {l.loanType}{l.lenderName ? ` · ${l.lenderName}` : ''} · Due {formatDate(l.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(l); }} className="rounded-control px-2 py-1 text-[0.76rem] text-muted hover:text-brass">Edit</button>
                      <button type="button" aria-label="Delete loan" onClick={(e) => { e.stopPropagation(); loansStore.remove(l.id); }}
                        className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-loss/10 hover:text-loss">
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  {clearedOrClosed ? (
                    <div className="mb-3 flex items-center gap-2 rounded-control border border-gain/30 bg-gain/10 px-3 py-2 text-[0.8rem] text-gain">
                      <CheckCircle2 size={14} /> {status === 'Closed' ? 'Closed — fully settled' : 'Principal cleared — only interest / charges remaining'}
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="mb-1.5 flex items-center justify-between text-[0.78rem]">
                        <span className="text-muted">Progress</span>
                        <span className="font-num text-soft">
                          {progress > 0.7 ? '🟢' : progress >= 0.3 ? '🟡' : '🔴'} {Math.round(progress * 100)}%
                        </span>
                      </div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-brass"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress * 100}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-[0.84rem]">
                    <Row k="Original principal" v={formatMoneyFull(l.principal)} />
                    <Row k="Paid principal" v={formatMoneyFull(paid)} />
                    <Row k="Outstanding principal" v={formatMoneyFull(Math.max(0, l.remaining))} />
                    <Row k="EMI" v={formatMoneyFull(l.emi)} />
                    <Row k="Interest rate" v={`${l.interestRate}%`} />
                    <Row k="Status" v={status} />
                  </div>
                </div>
              );
            })}
          </StageItem>
        </>
      )}

      <LoanEditor open={open} loan={editing} onClose={() => setOpen(false)} />
      <LoanDrawer loan={detail} ledger={ledger} commitments={commitments} accounts={accounts} onClose={() => setDetail(null)} onEdit={(l) => { setDetail(null); openEdit(l); }} />
    </PageStage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-hairline bg-surface p-5">
      <div className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">{label}</div>
      <div className="font-num text-[1.3rem] text-bright">{value}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted">{k}</span><span className="font-num text-soft">{v}</span></div>;
}

function LoanEditor({ open, loan, onClose }: { open: boolean; loan: Loan | null; onClose: () => void }) {
  const accounts = useAccounts();
  const [name, setName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('Personal Loan');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [emi, setEmi] = useState('');
  const [remaining, setRemaining] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lenderName, setLenderName] = useState('');
  const [isExisting, setIsExisting] = useState(true);
  const [accountId, setAccountId] = useState('');

  // seed when opened
  const seeded = useState({ id: '' })[0];
  if (open && seeded.id !== (loan?.id ?? 'new')) {
    seeded.id = loan?.id ?? 'new';
    setName(loan?.name ?? '');
    setLoanType(loan?.loanType ?? 'Personal Loan');
    setPrincipal(loan ? String(loan.principal) : '');
    setRate(loan ? String(loan.interestRate) : '');
    setEmi(loan ? String(loan.emi) : '');
    setRemaining(loan ? String(loan.remaining) : '');
    setDueDate(loan?.dueDate ?? new Date().toISOString().slice(0, 10));
    setStartDate(loan?.startDate ?? new Date().toISOString().slice(0, 10));
    setLenderName(loan?.lenderName ?? '');
    setIsExisting(loan?.isExisting ?? true);
    setAccountId(loan?.accountId ?? accounts[0]?.id ?? '');
  }

  const valid = name.trim() !== '' && Number(principal) > 0;
  const field = 'h-11 w-full rounded-control border border-hairline bg-ground px-3 text-[0.9rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none';
  const label = 'mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint';

  const submit = () => {
    if (!valid) return;
    const data = {
      name: name.trim(),
      loanType,
      lenderName: lenderName.trim() || undefined,
      principal: Number(principal),
      interestRate: Number(rate) || 0,
      emi: Number(emi) || 0,
      remaining: remaining === '' ? Number(principal) : Number(remaining),
      dueDate,
      startDate,
      accountId: accountId || undefined,
      isExisting,
    };
    if (loan) loansStore.update(loan.id, data);
    // Only a brand-new loan creates the one-time disbursement credit —
    // editing never re-fires it.
    else loansStore.add(data);
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
              <h3 className="font-serif text-[1.4rem] text-bright">{loan ? 'Edit loan' : 'New loan'}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:text-bright"><X size={18} /></button>
            </div>
            <div className="mb-4"><label className={label}>Loan name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home loan" autoFocus className={field} /></div>
            <div className="mb-4"><label className={label}>Loan type</label>
              <select value={loanType} onChange={(e) => setLoanType(e.target.value as LoanType)} className={field}>
                {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Original principal (₹)</label><input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className={field} /></div>
              <div><label className={label}>Outstanding principal (₹)</label><input type="number" value={remaining} onChange={(e) => setRemaining(e.target.value)} placeholder="Same as principal" className={field} /></div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>EMI (₹)</label><input type="number" value={emi} onChange={(e) => setEmi(e.target.value)} className={field} /></div>
              <div><label className={label}>Interest rate (%)</label><input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className={field} /></div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div><label className={label}>Lender name</label><input value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="e.g. HDFC Bank" className={field} /></div>
              <div><label className={label}>Loan start date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} /></div>
            </div>
            <div className="mb-4"><label className={label}>Next EMI date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} /></div>
            {!loan && (
              <div className="mb-4">
                <label className={label}>Is this an existing loan or a new one being received now?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setIsExisting(true)}
                    className={`h-11 rounded-control border text-[0.84rem] transition-colors ${isExisting ? 'border-brass bg-brass/10 text-bright' : 'border-hairline text-muted hover:border-brass-deep'}`}>
                    Existing loan
                  </button>
                  <button type="button" onClick={() => setIsExisting(false)}
                    className={`h-11 rounded-control border text-[0.84rem] transition-colors ${!isExisting ? 'border-brass bg-brass/10 text-bright' : 'border-hairline text-muted hover:border-brass-deep'}`}>
                    New loan, received now
                  </button>
                </div>
                <p className="mt-1.5 text-[0.76rem] text-faint">
                  {isExisting
                    ? "No income transaction is created — the money was received in the past."
                    : 'A "Loan Credit" income transaction will be created for the original principal.'}
                </p>
              </div>
            )}
            {!loan && !isExisting && (
              <div className="mb-4">
                <label className={label}>Disbursed to account</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
                  {accounts.length === 0 && <option value="">No accounts yet</option>}
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} (••••{a.last4})</option>)}
                </select>
                {Number(principal) > 0 && (
                  <p className="mt-1.5 text-[0.76rem] text-faint">
                    Creates a one-time {formatMoneyFull(Number(principal))} "Loan Credit" income transaction in this account.
                  </p>
                )}
              </div>
            )}
            <button type="button" disabled={!valid} onClick={submit} className="w-full rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-40">
              {loan ? 'Save changes' : 'Add loan'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Read-only details drawer: full repayment status, timeline, remaining
 * obligation, linked EMI commitments, and linked ledger transactions — all
 * derived from the existing single-ledger stores (no duplicate data).
 */
function LoanDrawer({
  loan, ledger, commitments, accounts, onClose, onEdit,
}: {
  loan: Loan | null;
  ledger: Transaction[];
  commitments: Commitment[];
  accounts: { id: string; name: string; last4: string }[];
  onClose: () => void;
  onEdit: (l: Loan) => void;
}) {
  if (!loan) return null;
  const paid = Math.max(0, loan.principal - loan.remaining);
  const progress = loan.principal > 0 ? Math.min(1, paid / loan.principal) : 0;
  const status = loanStatus(loan);
  const linkedTxns = ledger.filter((t) => t.loanId === loan.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const linkedCommitments = commitments.filter((c) => c.loanId === loan.id);
  const account = accounts.find((a) => a.id === loan.accountId);
  const health = progress > 0.7
    ? { dot: '🟢', label: 'Healthy' }
    : progress >= 0.3
      ? { dot: '🟡', label: 'Midway' }
      : { dot: '🔴', label: 'Early stage' };

  return (
    <AnimatePresence>
      {loan && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-void/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed right-0 top-0 z-[70] h-full w-[min(440px,100vw)] overflow-y-auto border-l border-hairline-strong bg-surface p-7 shadow-elevated"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[1.5rem] text-bright">{loan.name}</h3>
                <p className="font-mono text-[0.72rem] text-faint">
                  {loan.loanType}{loan.lenderName ? ` · ${loan.lenderName}` : ''}
                </p>
                {status === 'Active' && (
                  <p className="mt-1.5 text-[0.78rem] text-soft">{health.dot} {health.label}</p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:text-bright"><X size={18} /></button>
            </div>

            {status === 'Active' ? (
              <div className="mb-5">
                <div className="mb-1.5 flex items-center justify-between text-[0.78rem]">
                  <span className="text-muted">Progress</span>
                  <span className="font-num text-soft">{Math.round(progress * 100)}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-elevated">
                  <motion.div className="absolute inset-y-0 left-0 rounded-full bg-brass" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
            ) : (
              <div className="mb-5 flex items-center gap-2 rounded-control border border-gain/30 bg-gain/10 px-3 py-2 text-[0.8rem] text-gain">
                <CheckCircle2 size={14} /> {status === 'Closed' ? 'Closed — fully settled' : 'Principal cleared — only interest / charges remaining'}
              </div>
            )}

            {status === 'Principal Cleared' && (
              <button type="button" onClick={() => loansStore.markClosed(loan.id)}
                className="mb-5 w-full rounded-control border border-brass-deep/40 bg-brass/5 px-4 py-2.5 text-[0.84rem] font-medium text-brass transition-colors hover:bg-brass/10">
                Mark Loan Closed
              </button>
            )}

            <div className="mb-6 grid grid-cols-2 gap-3 text-[0.84rem]">
              <Row k="Original principal" v={formatMoneyFull(loan.principal)} />
              <Row k="Paid principal" v={formatMoneyFull(paid)} />
              <Row k="Remaining principal" v={formatMoneyFull(Math.max(0, loan.remaining))} />
              <Row k="Progress" v={`${Math.round(progress * 100)}%`} />
              <Row k="EMI" v={formatMoneyFull(loan.emi)} />
              <Row k="Interest rate" v={`${loan.interestRate}%`} />
              <Row k="Next due date" v={formatDate(loan.dueDate)} />
              <Row k="Status" v={status} />
              {loan.startDate && <Row k="Loan start date" v={formatDate(loan.startDate)} />}
              {loan.createdAt && <Row k="Created date" v={formatDate(loan.createdAt.slice(0, 10))} />}
              {account && <Row k="Account" v={`${account.name} (••••${account.last4})`} />}
            </div>

            <h4 className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">Timeline</h4>
            <div className="mb-5 flex flex-col gap-2">
              {[
                ...(loan.createdAt ? [{ label: 'Loan created', date: loan.createdAt.slice(0, 10) }] : []),
                ...linkedTxns.map((t) => ({
                  label: t.amount >= 0 ? 'Loan credit received' : 'EMI payment',
                  date: t.date,
                })),
                ...(status !== 'Active' ? [{ label: 'Principal cleared', date: linkedTxns[0]?.date ?? loan.dueDate }] : []),
                ...(status === 'Closed' ? [{ label: 'Loan closed', date: linkedTxns[0]?.date ?? loan.dueDate }] : []),
              ]
                .sort((a, b) => (a.date < b.date ? -1 : 1))
                .map((ev, i) => (
                  <div key={i} className="flex items-center justify-between rounded-control border border-hairline px-3 py-2 text-[0.82rem]">
                    <span className="text-soft">{ev.label}</span>
                    <span className="font-num text-muted">{formatDate(ev.date)}</span>
                  </div>
                ))}
            </div>

            <h4 className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">Linked EMI commitments</h4>
            {linkedCommitments.length === 0 ? (
              <p className="mb-5 text-[0.82rem] text-faint">No EMI commitment configured.</p>
            ) : (
              <div className="mb-5 flex flex-col gap-2">
                {linkedCommitments.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-control border border-hairline px-3 py-2 text-[0.82rem]">
                    <span className="text-soft">{c.name}</span>
                    <span className="font-num text-muted">{formatMoneyFull(c.amount)} · Due {formatDate(c.dueDate)}</span>
                  </div>
                ))}
              </div>
            )}

            <h4 className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">Linked ledger transactions</h4>
            {linkedTxns.length === 0 ? (
              <p className="mb-5 text-[0.82rem] text-faint">No transactions linked yet.</p>
            ) : (
              <div className="mb-5 flex flex-col gap-2">
                {linkedTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-control border border-hairline px-3 py-2 text-[0.82rem]">
                    <div>
                      <div className="text-soft">{t.description}</div>
                      <div className="text-[0.72rem] text-faint">{formatDate(t.date)}</div>
                    </div>
                    <Money amount={t.amount} className="text-[0.84rem]" />
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => onEdit(loan)} className="mt-2 w-full rounded-control border border-hairline px-5 py-2.5 text-[0.86rem] text-soft transition-colors hover:border-brass-deep hover:text-bright">
              Edit loan
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
