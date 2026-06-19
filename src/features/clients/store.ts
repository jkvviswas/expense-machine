import { useSyncExternalStore } from 'react';
import { persist } from '../../lib/persist';
import { generateId } from '../../lib/id';

/**
 * ============================================================================
 *  CLIENTS STORE  (presentation-layer, additive)
 * ============================================================================
 *
 * The small-business expansion: the people/organisations a user does business
 * with, the revenue attributed to them, and an invoice-ready data model.
 *
 * Revenue tracking reads from the user's income transactions (see
 * clients/derive.ts) without touching the locked ledger — a client simply
 * carries matching rules (name fragments) used to attribute income. Invoices
 * are modelled here so an invoicing UI can be added later with no schema change.
 *
 * Persisted; no locked file is touched.
 */

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number; // rupees
  /** Optional GST/tax rate as a percentage (e.g. 18 for 18% GST). */
  taxRate?: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  number: string; // e.g. INV-2026-014
  issuedOn: string; // ISO date
  dueOn: string; // ISO date
  status: InvoiceStatus;
  lines: InvoiceLine[];
  notes?: string;
  /** Amount paid so far (for partial payments). Defaults to 0 / full on paid. */
  paidAmount?: number;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst?: string;
  notes?: string;
  /** Lower-cased name fragments used to attribute ledger income to this client. */
  matchers: string[];
  /** Optional default rate for invoice drafting. */
  defaultRate?: number;
  archived?: boolean;
  createdAt: string;
}

interface ClientsShape {
  clients: Client[];
  invoices: Invoice[];
}

const KEY = 'clients';

let state: ClientsShape = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): ClientsShape {
  const saved = persist.read<ClientsShape | null>(KEY, null);
  if (saved && typeof saved === 'object' && Array.isArray(saved.clients)) {
    // Respect any persisted state, including an intentionally empty workspace.
    return saved;
  }
  // Every user starts with an empty Clients workspace: 0 clients, 0 invoices,
  // 0 revenue. Clients only ever exist because the user explicitly added them
  // — no seeded/demo companies anywhere.
  return { clients: [], invoices: [] };
}
function save() {
  persist.write(KEY, state);
}

export const clientsStore = {
  get(): ClientsShape {
    return state;
  },

  addClient(input: Omit<Client, 'id' | 'createdAt'>): Client {
    const client: Client = {
      ...input,
      id: generateId('c'),
      createdAt: new Date().toISOString(),
    };
    state = { ...state, clients: [client, ...state.clients] };
    save();
    emit();
    return client;
  },

  updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    state = {
      ...state,
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
    save();
    emit();
  },

  removeClient(id: string) {
    state = {
      clients: state.clients.filter((c) => c.id !== id),
      invoices: state.invoices.filter((i) => i.clientId !== id),
    };
    save();
    emit();
  },

  /** Archive / restore a client (keeps invoices, hides from active lists). */
  archiveClient(id: string, archived = true) {
    this.updateClient(id, { archived });
  },

  /**
   * Merge `sourceId` into `targetId`: reassign the source's invoices to the
   * target, fold the source's matchers into the target, then delete the source.
   * Used for de-duplicating clients (Phase 1).
   */
  mergeClients(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const source = state.clients.find((c) => c.id === sourceId);
    const target = state.clients.find((c) => c.id === targetId);
    if (!source || !target) return;
    const mergedMatchers = [...new Set([...target.matchers, ...source.matchers])];
    state = {
      clients: state.clients
        .filter((c) => c.id !== sourceId)
        .map((c) => (c.id === targetId ? { ...c, matchers: mergedMatchers } : c)),
      invoices: state.invoices.map((i) =>
        i.clientId === sourceId ? { ...i, clientId: targetId } : i,
      ),
    };
    save();
    emit();
  },

  /**
   * Record a payment against an invoice (Phase 4). Adds to paidAmount and moves
   * the status to 'partial' or 'paid' depending on whether the total is met.
   */
  recordPayment(invoiceId: string, amount: number, total: number) {
    state = {
      ...state,
      invoices: state.invoices.map((i) => {
        if (i.id !== invoiceId) return i;
        const paid = Math.min(total, (i.paidAmount ?? 0) + amount);
        const status: InvoiceStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : i.status;
        return { ...i, paidAmount: paid, status };
      }),
    };
    save();
    emit();
  },

  addInvoice(input: Omit<Invoice, 'id'>): Invoice {
    const invoice: Invoice = { ...input, id: generateId('inv') };
    state = { ...state, invoices: [invoice, ...state.invoices] };
    save();
    emit();
    return invoice;
  },

  updateInvoice(id: string, patch: Partial<Omit<Invoice, 'id' | 'clientId'>>) {
    state = {
      ...state,
      invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    };
    save();
    emit();
  },

  /**
   * Set an invoice's status, recomputing `paidAmount` so it stays consistent
   * with the new status (fixes stale paidAmount after manual status changes,
   * e.g. Paid -> Overdue leaving paidAmount = total and Outstanding = 0).
   */
  setInvoiceStatus(id: string, status: InvoiceStatus) {
    state = {
      ...state,
      invoices: state.invoices.map((i) => {
        if (i.id !== id) return i;
        const total = invoiceTotal(i);
        let paidAmount = i.paidAmount ?? 0;
        if (status === 'paid') {
          paidAmount = total;
        } else if (status === 'draft' || status === 'sent' || status === 'overdue') {
          paidAmount = 0;
        } else if (status === 'partial') {
          paidAmount = Math.min(Math.max(paidAmount, 0), total);
          if (paidAmount <= 0 || paidAmount >= total) paidAmount = 0;
        }
        return { ...i, status, paidAmount };
      }),
    };
    save();
    emit();
  },

  removeInvoice(id: string) {
    state = { ...state, invoices: state.invoices.filter((i) => i.id !== id) };
    save();
    emit();
  },

  /** Generate the next sequential invoice number for the current year. */
  nextInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const seq = state.invoices
      .map((i) => {
        const m = i.number.match(/INV-\d{4}-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}${String(seq + 1).padStart(3, '0')}`;
  },

  reset() {
    state = { clients: [], invoices: [] };
    save();
    emit();
  },

  /** Empty the workspace (used by the clean-start onboarding path). */
  clearAll() {
    state = { clients: [], invoices: [] };
    save();
    emit();
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useClients(): ClientsShape {
  return useSyncExternalStore(clientsStore.subscribe, clientsStore.get, clientsStore.get);
}

/** Per-line subtotal (pre-tax). */
export function lineSubtotal(l: InvoiceLine): number {
  return l.quantity * l.unitAmount;
}

/** Per-line tax amount. */
export function lineTax(l: InvoiceLine): number {
  return l.taxRate ? (l.quantity * l.unitAmount * l.taxRate) / 100 : 0;
}

/** Invoice subtotal before tax. */
export function invoiceSubtotal(inv: Invoice): number {
  return inv.lines.reduce((s, l) => s + lineSubtotal(l), 0);
}

/** Invoice total tax. */
export function invoiceTax(inv: Invoice): number {
  return inv.lines.reduce((s, l) => s + lineTax(l), 0);
}

/** Invoice grand total (subtotal + tax). */
export function invoiceTotal(inv: Invoice): number {
  return Math.round((invoiceSubtotal(inv) + invoiceTax(inv)) * 100) / 100;
}
