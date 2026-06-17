import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  clientsStore,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  type Invoice,
  type InvoiceLine,
  type InvoiceStatus,
  type Client,
} from './store';
import { formatMoneyFull } from '../import/format';

/**
 * Invoice create/edit flow (Phase 14). Handles line items with quantity, unit
 * amount and optional per-line tax rate, issue/due dates, status, and notes.
 * On save it persists through the clients store (addInvoice / updateInvoice),
 * so totals and revenue analytics update everywhere immediately.
 */

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue'];

function blankLine(): InvoiceLine {
  return { id: `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, description: '', quantity: 1, unitAmount: 0 };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

interface Props {
  client: Client;
  /** Existing invoice when editing; undefined when creating. */
  invoice?: Invoice;
  onClose: () => void;
}

export function InvoiceEditor({ client, invoice, onClose }: Props) {
  const editing = !!invoice;
  const [number] = useState(invoice?.number ?? clientsStore.nextInvoiceNumber());
  const [issuedOn, setIssuedOn] = useState(invoice?.issuedOn ?? todayIso());
  const [dueOn, setDueOn] = useState(invoice?.dueOn ?? plusDaysIso(14));
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? 'draft');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [lines, setLines] = useState<InvoiceLine[]>(
    invoice?.lines.length
      ? invoice.lines.map((l) => ({ ...l }))
      : [{ ...blankLine(), unitAmount: client.defaultRate ?? 0 }],
  );

  const draft: Invoice = {
    id: invoice?.id ?? 'preview',
    clientId: client.id,
    number,
    issuedOn,
    dueOn,
    status,
    lines,
    notes: notes.trim() || undefined,
  };

  const updateLine = (id: string, patch: Partial<InvoiceLine>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, blankLine()]);
  const removeLine = (id: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));

  const canSave = lines.some((l) => l.description.trim() && l.quantity > 0);

  const save = () => {
    if (!canSave) return;
    const clean = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        ...l,
        quantity: Number(l.quantity) || 0,
        unitAmount: Number(l.unitAmount) || 0,
        taxRate: l.taxRate ? Number(l.taxRate) : undefined,
      }));
    if (editing && invoice) {
      clientsStore.updateInvoice(invoice.id, { number, issuedOn, dueOn, status, lines: clean, notes: notes.trim() || undefined });
    } else {
      clientsStore.addInvoice({ clientId: client.id, number, issuedOn, dueOn, status, lines: clean, notes: notes.trim() || undefined });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-void/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-panel border border-hairline-strong bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-brass">
              {editing ? 'Edit invoice' : 'New invoice'} · {client.name}
            </p>
            <h3 className="mt-0.5 font-serif text-[1.3rem] text-bright">{number}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-bright"
          >
            <X size={16} />
          </button>
        </div>

        {/* body (scrolls) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* meta row */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <Labeled label="Issued">
              <input
                type="date"
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
                className="h-9 w-full rounded-control border border-hairline bg-ground px-2.5 text-[0.82rem] text-bright focus:border-brass focus:outline-none"
              />
            </Labeled>
            <Labeled label="Due">
              <input
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
                className="h-9 w-full rounded-control border border-hairline bg-ground px-2.5 text-[0.82rem] text-bright focus:border-brass focus:outline-none"
              />
            </Labeled>
            <Labeled label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="h-9 w-full rounded-control border border-hairline bg-ground px-2 text-[0.82rem] capitalize text-bright focus:border-brass focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-ground">
                    {s}
                  </option>
                ))}
              </select>
            </Labeled>
          </div>

          {/* line items */}
          <div className="mb-2 grid grid-cols-[1fr_56px_84px_56px_32px] gap-2 px-1">
            {['Description', 'Qty', 'Rate', 'Tax %', ''].map((h, i) => (
              <span
                key={h + i}
                className={['font-mono text-[0.58rem] uppercase tracking-[0.1em] text-faint', i > 0 && i < 4 ? 'text-right' : ''].join(' ')}
              >
                {h}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_56px_84px_56px_32px] items-center gap-2">
                <input
                  value={line.description}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  placeholder="Service or item"
                  className="h-9 rounded-control border border-hairline bg-ground px-2.5 text-[0.82rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                  className="h-9 rounded-control border border-hairline bg-ground px-1.5 text-right text-[0.82rem] text-bright focus:border-brass focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={line.unitAmount}
                  onChange={(e) => updateLine(line.id, { unitAmount: Number(e.target.value) })}
                  className="h-9 rounded-control border border-hairline bg-ground px-1.5 text-right text-[0.82rem] text-bright focus:border-brass focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={line.taxRate ?? ''}
                  onChange={(e) => updateLine(line.id, { taxRate: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  className="h-9 rounded-control border border-hairline bg-ground px-1.5 text-right text-[0.82rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  aria-label="Remove line"
                  className="flex h-9 w-8 items-center justify-center rounded-control text-faint transition-colors hover:text-loss disabled:opacity-30"
                  disabled={lines.length <= 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 flex items-center gap-1.5 rounded-control border border-hairline px-3 py-1.5 text-[0.78rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
          >
            <Plus size={13} /> Add line
          </button>

          {/* notes */}
          <div className="mt-5">
            <Labeled label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment terms, thank-you note…"
                className="w-full resize-none rounded-control border border-hairline bg-ground px-2.5 py-2 text-[0.82rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
              />
            </Labeled>
          </div>
        </div>

        {/* footer: totals + actions */}
        <div className="border-t border-hairline px-6 py-4">
          <div className="mb-3 flex items-end justify-between">
            <div className="space-y-0.5">
              <Row label="Subtotal" value={formatMoneyFull(invoiceSubtotal(draft))} />
              {invoiceTax(draft) > 0 && <Row label="Tax" value={formatMoneyFull(invoiceTax(draft))} />}
            </div>
            <div className="text-right">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">Total</div>
              <div className="font-num text-[1.25rem] text-bright">
                {formatMoneyFull(invoiceTotal(draft))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-control border border-hairline px-4 py-2 text-[0.84rem] text-muted transition-colors hover:text-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="rounded-control bg-brass px-5 py-2 text-[0.84rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-50"
            >
              {editing ? 'Save changes' : 'Create invoice'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-[0.8rem]">
      <span className="text-muted">{label}</span>
      <span className="font-num text-soft">{value}</span>
    </div>
  );
}
