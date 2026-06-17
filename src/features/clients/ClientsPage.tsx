import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  TrendingUp,
  Receipt,
  CircleDollarSign,
  X,
  FileText,
  Download,
  Pencil,
  ChevronDown,
  Check,
} from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { Money } from '../import/components/Money';
import { formatMoneyFull, formatDate } from '../import/format';
import { useLedger } from '../transactions/store';
import type { Transaction } from '../transactions/types';
import { payInvoice } from './actions';
import {
  clientsStore,
  useClients,
  invoiceTotal,
  type Invoice,
  type InvoiceStatus,
} from './store';
import { clientRevenues, clientsOverview } from './derive';
import { InvoiceEditor } from './InvoiceEditor';
import { downloadInvoicePdf } from './invoicePdf';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'partial', 'paid', 'overdue'];

const statusTone: Record<InvoiceStatus, string> = {
  draft: 'var(--em-muted)',
  sent: 'var(--em-watch)',
  partial: 'var(--em-brass)',
  paid: 'var(--em-gain)',
  overdue: 'var(--em-loss)',
};

export function ClientsPage() {
  const ledger = useLedger();
  const txns = useMemo(() => ledger ?? [], [ledger]);
  const { clients, invoices } = useClients();
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const allRows = useMemo(
    () => clientRevenues(clients, invoices, txns),
    [clients, invoices, txns],
  );
  // Archived clients are hidden from the main list unless explicitly shown.
  const rows = useMemo(
    () => allRows.filter((r) => showArchived || !r.client.archived),
    [allRows, showArchived],
  );
  const archivedCount = allRows.filter((r) => r.client.archived).length;
  const overview = useMemo(() => clientsOverview(rows), [rows]);
  const active = allRows.find((r) => r.client.id === activeId) ?? null;

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
            Clients
          </p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">
            The people you do business with
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
        >
          <Plus size={16} strokeWidth={2} /> Add client
        </button>
      </StageItem>

      {/* Overview row */}
      <StageItem className="mb-7">
        <div className="grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<CircleDollarSign size={15} />} label="Total revenue">
            <Money amount={overview.totalRevenue} />
          </Metric>
          <Metric icon={<TrendingUp size={15} />} label="This month">
            <Money amount={overview.recentRevenue} />
          </Metric>
          <Metric icon={<Users size={15} />} label="Active clients">
            <span className="font-num text-[1.05rem] text-bright">
              {overview.activeClients}
            </span>
          </Metric>
          <Metric icon={<Receipt size={15} />} label="Outstanding">
            <Money amount={-overview.totalOutstanding} />
          </Metric>
        </div>
      </StageItem>

      {/* Client list */}
      <StageItem>
        {rows.length === 0 && !showArchived && archivedCount === 0 ? (
          <Empty onAdd={() => setAdding(true)} />
        ) : (
          <>
            {archivedCount > 0 && (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowArchived((s) => !s)}
                  className="rounded-control border border-hairline px-3 py-1.5 text-[0.76rem] text-muted transition-colors hover:border-brass-deep hover:text-bright"
                >
                  {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
                </button>
              </div>
            )}
            <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
            <div className="grid grid-cols-[1fr_120px_120px_90px] gap-3 border-b border-hairline px-5 py-3 sm:grid-cols-[1fr_150px_150px_110px]">
              {['Client', 'Total revenue', 'This month', 'Invoices'].map((h, i) => (
                <span
                  key={h}
                  className={[
                    'font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint',
                    i > 0 ? 'text-right' : '',
                  ].join(' ')}
                >
                  {h}
                </span>
              ))}
            </div>
            {rows.map((r) => (
              <button
                key={r.client.id}
                type="button"
                onClick={() => setActiveId(r.client.id)}
                className="grid w-full grid-cols-[1fr_120px_120px_90px] items-center gap-3 border-b border-hairline px-5 py-4 text-left transition-colors last:border-0 hover:bg-elevated/50 sm:grid-cols-[1fr_150px_150px_110px]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[0.92rem] text-bright">{r.client.name}</span>
                    {r.client.archived && (
                      <span className="rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-wider text-faint">archived</span>
                    )}
                  </div>
                  {r.client.company && (
                    <div className="truncate text-[0.74rem] text-faint">{r.client.company}</div>
                  )}
                </div>
                <Money amount={r.totalRevenue} className="text-right text-[0.88rem]" />
                <Money amount={r.recentRevenue} className="text-right text-[0.88rem]" />
                <span className="text-right font-mono text-[0.82rem] text-muted">
                  {r.invoices.length}
                </span>
              </button>
            ))}
            </div>
          </>
        )}
      </StageItem>

      {/* Add modal */}
      <AnimatePresence>
        {adding && <AddClientModal onClose={() => setAdding(false)} />}
      </AnimatePresence>

      {/* Detail drawer */}
      <AnimatePresence>
        {active && (
          <ClientDetail
            key={active.client.id}
            row={active}
            allRows={allRows}
            onClose={() => setActiveId(null)}
          />
        )}
      </AnimatePresence>
    </PageStage>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-muted">
        {icon}
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">
          {label}
        </span>
      </div>
      <div className="text-[1.05rem]">{children}</div>
    </div>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[36vh] flex-col items-center justify-center text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--em-glow-ambient), transparent 60%)' }}
        />
        <Users size={28} strokeWidth={1.5} className="text-faint" />
      </div>
      <h3 className="font-serif text-[1.3rem] text-bright">No clients yet</h3>
      <p className="mt-2 max-w-sm text-[0.88rem] text-muted">
        Add the people you bill, and Expense Machine will attribute matching
        income from your ledger to them automatically.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 flex items-center gap-2 rounded-control bg-brass px-4 py-2.5 text-[0.86rem] font-medium text-void transition-colors hover:bg-brass-bright"
      >
        <Plus size={16} strokeWidth={2} /> Add your first client
      </button>
    </div>
  );
}

function AddClientModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [matchers, setMatchers] = useState('');

  const save = () => {
    if (!name.trim()) return;
    clientsStore.addClient({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      matchers: (matchers || name)
        .split(',')
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-panel border border-hairline-strong bg-surface p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-[1.3rem] text-bright">Add a client</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-bright"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <ModalField label="Name" value={name} onChange={setName} placeholder="Client name" />
          <ModalField label="Company" value={company} onChange={setCompany} placeholder="Optional" />
          <ModalField label="Email" value={email} onChange={setEmail} placeholder="Optional" />
          <div>
            <ModalField
              label="Match terms"
              value={matchers}
              onChange={setMatchers}
              placeholder="Comma-separated, e.g. lumen, lumen studio"
            />
            <p className="mt-1.5 text-[0.72rem] text-faint">
              Income whose description contains these terms is attributed to this
              client. Defaults to the name.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-brass px-5 py-3 text-[0.9rem] font-medium text-void transition-colors hover:bg-brass-bright"
        >
          Add client
        </button>
      </motion.div>
    </motion.div>
  );
}

function ModalField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-control border border-hairline bg-ground px-3 text-[0.88rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
      />
    </label>
  );
}

function ClientDetail({
  row,
  allRows,
  onClose,
}: {
  row: ReturnType<typeof clientRevenues>[number];
  allRows: ReturnType<typeof clientRevenues>;
  onClose: () => void;
}) {
  // Invoice editor state: null = closed, 'new' = creating, Invoice = editing.
  const [editorFor, setEditorFor] = useState<'new' | Invoice | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Payment-match suggestions (Phase 5): attributed income transactions whose
  // amount matches an unpaid/partial invoice balance for this client.
  const suggestions = useMemo(() => {
    const unpaid = row.invoices.filter((i) => i.status !== 'paid');
    const out: { invoice: Invoice; txn: Transaction }[] = [];
    for (const inv of unpaid) {
      const balance = Math.max(0, invoiceTotal(inv) - (inv.paidAmount ?? 0));
      const match = row.transactions.find(
        (t) => t.amount > 0 && Math.abs(t.amount - balance) < 1 && !dismissed.has(inv.id + t.id),
      );
      if (match) out.push({ invoice: inv, txn: match });
    }
    return out;
  }, [row.invoices, row.transactions, dismissed]);

  // Other clients available as a merge target.
  const mergeTargets = allRows.filter((r) => r.client.id !== row.client.id);

  const archived = row.client.archived ?? false;
  const toggleArchive = () => {
    clientsStore.archiveClient(row.client.id, !archived);
    onClose();
  };
  const doMerge = (targetId: string) => {
    clientsStore.mergeClients(row.client.id, targetId);
    setMergeOpen(false);
    onClose();
  };

  // Simple 6-month revenue sparkline data from attributed income.
  const monthly = useMemo(() => monthlyRevenue(row.transactions), [row.transactions]);
  const maxMonth = Math.max(1, ...monthly.map((m) => m.total));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-void/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="h-full w-full max-w-md overflow-y-auto border-l border-hairline bg-surface p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-[1.5rem] leading-tight text-bright">
              {row.client.name}
            </h3>
            {row.client.company && (
              <p className="mt-0.5 text-[0.82rem] text-muted">{row.client.company}</p>
            )}
            {row.client.email && (
              <p className="mt-0.5 font-mono text-[0.74rem] text-faint">{row.client.email}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMergeOpen((o) => !o)}
              className="rounded-control border border-hairline px-2.5 py-1 text-[0.74rem] text-muted transition-colors hover:border-brass-deep hover:text-bright"
            >
              Merge
            </button>
            <button
              type="button"
              onClick={toggleArchive}
              className="rounded-control border border-hairline px-2.5 py-1 text-[0.74rem] text-muted transition-colors hover:border-brass-deep hover:text-bright"
            >
              {archived ? 'Restore' : 'Archive'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-bright"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Merge target picker */}
        {mergeOpen && (
          <div className="mb-5 rounded-panel border border-hairline bg-elevated p-4">
            {mergeTargets.length === 0 ? (
              <p className="text-[0.8rem] text-muted">No other clients to merge into.</p>
            ) : (
              <>
                <p className="mb-2 text-[0.8rem] text-muted">
                  Merge <span className="text-bright">{row.client.name}</span> into — its invoices and history move over, then it's removed:
                </p>
                <div className="flex flex-col gap-1">
                  {mergeTargets.map((t) => (
                    <button
                      key={t.client.id}
                      type="button"
                      onClick={() => doMerge(t.client.id)}
                      className="flex items-center justify-between rounded-control px-3 py-2 text-left text-[0.84rem] text-soft transition-colors hover:bg-surface"
                    >
                      <span>{t.client.name}</span>
                      <span className="font-mono text-[0.72rem] text-faint">{t.invoiceCount} inv</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-3">
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
              Total revenue
            </div>
            <Money amount={row.totalRevenue} className="text-[1rem]" />
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
              Outstanding
            </div>
            <Money amount={-row.outstanding} className="text-[1rem]" />
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
              Paid
            </div>
            <span className="font-num text-[1rem] text-bright">{formatMoneyFull(row.paid)}</span>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
              Tax collected
            </div>
            <span className="font-num text-[1rem] text-bright">{formatMoneyFull(row.taxCollected)}</span>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
              Invoices
            </div>
            <span className="font-num text-[1rem] text-bright">{row.invoiceCount}</span>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
              Avg invoice
            </div>
            <span className="font-num text-[1rem] text-bright">{formatMoneyFull(row.avgInvoiceValue)}</span>
          </div>
        </div>

        {/* Revenue analytics — 6-month attributed income */}
        {monthly.some((m) => m.total > 0) && (
          <div className="mb-6">
            <h4 className="mb-3 font-serif text-[1.05rem] text-bright">Revenue trend</h4>
            <div className="flex items-end gap-1.5 rounded-panel border border-hairline bg-elevated px-4 pb-3 pt-4">
              {monthly.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[22px] rounded-t-sm bg-brass-deep"
                      style={{ height: `${Math.max(3, (m.total / maxMonth) * 100)}%` }}
                      title={formatMoneyFull(m.total)}
                    />
                  </div>
                  <span className="font-mono text-[0.55rem] uppercase text-faint">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-brass" strokeWidth={1.75} />
              <h4 className="font-serif text-[1.05rem] text-bright">Invoices</h4>
            </div>
            <button
              type="button"
              onClick={() => setEditorFor('new')}
              className="flex items-center gap-1.5 rounded-control bg-brass px-3 py-1.5 text-[0.76rem] font-medium text-void transition-colors hover:bg-brass-bright"
            >
              <Plus size={13} strokeWidth={2.2} /> New
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {suggestions.map(({ invoice, txn }) => (
                <div key={invoice.id + txn.id} className="rounded-control border border-brass-deep/40 bg-brass/[0.06] px-4 py-3">
                  <p className="text-[0.8rem] text-soft">
                    Match payment of <span className="font-num text-bright">{formatMoneyFull(txn.amount)}</span> to invoice <span className="text-bright">{invoice.number}</span>?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => clientsStore.recordPayment(invoice.id, txn.amount, invoiceTotal(invoice))}
                      className="rounded-control bg-brass px-3 py-1.5 text-[0.76rem] font-medium text-void transition-colors hover:bg-brass-bright"
                    >
                      Match payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissed((d) => new Set(d).add(invoice.id + txn.id))}
                      className="rounded-control border border-hairline px-3 py-1.5 text-[0.76rem] text-muted transition-colors hover:text-bright"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {row.invoices.length === 0 ? (
            <p className="rounded-control border border-hairline bg-elevated px-4 py-3 text-[0.82rem] text-muted">
              No invoices yet. Create one — line items, tax, and a branded PDF are
              all supported.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {row.invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} onEdit={() => setEditorFor(inv)} clientId={row.client.id} />
              ))}
            </div>
          )}
        </div>

        {/* Attributed income */}
        <div>
          <h4 className="mb-3 font-serif text-[1.05rem] text-bright">Recent revenue</h4>
          {row.transactions.length === 0 ? (
            <p className="rounded-control border border-hairline bg-elevated px-4 py-3 text-[0.82rem] text-muted">
              No matching income in your ledger yet. Adjust this client’s match
              terms if payments aren’t being attributed.
            </p>
          ) : (
            <div className="flex flex-col">
              {row.transactions.slice(0, 8).map((t, i, arr) => (
                <div
                  key={t.id}
                  className={[
                    'flex items-center justify-between py-2.5',
                    i < arr.length - 1 ? 'border-b border-hairline' : '',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[0.84rem] text-bright">{t.merchant}</div>
                    <div className="text-[0.72rem] text-faint">{formatDate(t.date)}</div>
                  </div>
                  <Money amount={t.amount} className="text-[0.84rem]" />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            clientsStore.removeClient(row.client.id);
            onClose();
          }}
          className="mt-7 w-full rounded-control border border-hairline px-4 py-2.5 text-[0.82rem] text-muted transition-colors hover:border-loss hover:text-loss"
        >
          Remove client
        </button>
      </motion.aside>

      <AnimatePresence>
        {editorFor && (
          <InvoiceEditor
            client={row.client}
            invoice={editorFor === 'new' ? undefined : editorFor}
            onClose={() => setEditorFor(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** A single invoice row with status menu, edit, and PDF export. */
function InvoiceRow({
  invoice,
  clientId,
  onEdit,
}: {
  invoice: Invoice;
  clientId: string;
  onEdit: () => void;
}) {
  const { clients } = useClients();
  const [statusOpen, setStatusOpen] = useState(false);
  const client = clients.find((c) => c.id === clientId);

  return (
    <div className="rounded-control border border-hairline bg-elevated px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[0.84rem] text-bright">{invoice.number}</div>
          <div className="text-[0.72rem] text-faint">Due {formatDate(invoice.dueOn)}</div>
        </div>
        <span className="font-num text-[0.84rem] text-bright">
          {formatMoneyFull(invoiceTotal(invoice))}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {/* status selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            className="flex items-center gap-1 rounded-control border border-hairline px-2 py-1 font-mono text-[0.56rem] uppercase tracking-wider"
            style={{ color: statusTone[invoice.status] }}
          >
            {invoice.status}
            <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} aria-hidden />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-8 z-20 w-28 overflow-hidden rounded-control border border-hairline-strong bg-ground"
                >
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        clientsStore.setInvoiceStatus(invoice.id, s);
                        setStatusOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-1.5 text-left font-mono text-[0.6rem] uppercase tracking-wider capitalize transition-colors hover:bg-surface"
                      style={{ color: statusTone[s] }}
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {invoice.status !== 'paid' && (
            <button
              type="button"
              onClick={() => payInvoice(invoice)}
              className="flex items-center gap-1 rounded-control border border-hairline px-2 py-1 text-[0.7rem] text-gain transition-colors hover:border-gain/50"
            >
              <Check size={12} strokeWidth={2} /> Mark paid
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit invoice"
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface hover:text-bright"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => client && downloadInvoicePdf(invoice, client)}
            aria-label="Download PDF"
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface hover:text-brass"
          >
            <Download size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Group attributed income into the last 6 calendar months for a sparkline. */
function monthlyRevenue(txns: { date: string; amount: number }[]) {
  const now = new Date();
  const buckets: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: d.toLocaleDateString('en-IN', { month: 'short' }).slice(0, 3), total: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const t of txns) {
    const k = t.date.slice(0, 7);
    const b = byKey.get(k);
    if (b && t.amount > 0) b.total += t.amount;
  }
  return buckets;
}
