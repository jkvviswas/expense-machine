import type { Transaction } from '../transactions/types';
import type { Client, Invoice } from './store';
import { invoiceTotal, invoiceTax } from './store';

/**
 * ============================================================================
 *  CLIENTS DERIVE  (presentation-layer, read-only — no locked files)
 * ============================================================================
 *
 * Attributes ledger income to clients using each client's name matchers, and
 * summarises revenue + invoicing. It only READS transactions; it never mutates
 * the ledger or any locked calculation.
 */

export interface ClientRevenue {
  client: Client;
  /** Income transactions attributed to this client. */
  transactions: Transaction[];
  totalRevenue: number;
  /** Revenue in the most recent ledger month. */
  recentRevenue: number;
  lastPaymentDate: string | null;
  invoices: Invoice[];
  outstanding: number; // sum of unpaid invoice balances (sent/partial/overdue)
  paid: number; // sum of paid amounts across invoices
  taxCollected: number; // total tax on paid/partial invoices
  invoiceCount: number;
  avgInvoiceValue: number;
  lastActivity: string | null; // most recent of last payment or last invoice
}

function attribute(txn: Transaction, client: Client): boolean {
  if (txn.amount <= 0) return false; // revenue = income only
  const hay = `${txn.merchant} ${txn.description}`.toLowerCase();
  return client.matchers.some((m) => m && hay.includes(m.toLowerCase()));
}

export function clientRevenues(
  clients: Client[],
  invoices: Invoice[],
  txns: Transaction[],
): ClientRevenue[] {
  const months = [...new Set(txns.map((t) => t.date.slice(0, 7)))].sort();
  const latestMonth = months[months.length - 1] ?? '';

  return clients
    .map((client) => {
      const matched = txns
        .filter((t) => attribute(t, client))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      const totalRevenue = matched.reduce((s, t) => s + t.amount, 0);
      const recentRevenue = matched
        .filter((t) => t.date.slice(0, 7) === latestMonth)
        .reduce((s, t) => s + t.amount, 0);
      const clientInvoices = invoices.filter((i) => i.clientId === client.id);

      // Outstanding = unpaid balance on sent/partial/overdue invoices
      // (total − paidAmount). Paid = sum of recorded payments. Tax collected =
      // tax on invoices that have been paid or partially paid.
      const outstanding = clientInvoices
        .filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'partial')
        .reduce((s, i) => s + Math.max(0, invoiceTotal(i) - (i.paidAmount ?? 0)), 0);
      const paid = clientInvoices.reduce(
        (s, i) => s + (i.status === 'paid' ? invoiceTotal(i) : i.paidAmount ?? 0),
        0,
      );
      const taxCollected = clientInvoices
        .filter((i) => i.status === 'paid' || i.status === 'partial')
        .reduce((s, i) => s + invoiceTax(i), 0);
      const invoiceCount = clientInvoices.length;
      const avgInvoiceValue = invoiceCount
        ? clientInvoices.reduce((s, i) => s + invoiceTotal(i), 0) / invoiceCount
        : 0;

      const lastPaymentDate = matched[0]?.date ?? null;
      const lastInvoiceDate = clientInvoices
        .map((i) => i.issuedOn)
        .sort()
        .reverse()[0] ?? null;
      const lastActivity = [lastPaymentDate, lastInvoiceDate]
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;

      return {
        client,
        transactions: matched,
        totalRevenue,
        recentRevenue,
        lastPaymentDate,
        invoices: clientInvoices,
        outstanding,
        paid,
        taxCollected,
        invoiceCount,
        avgInvoiceValue,
        lastActivity,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export interface ClientsOverview {
  totalRevenue: number;
  recentRevenue: number;
  activeClients: number;
  totalOutstanding: number;
}

export function clientsOverview(rows: ClientRevenue[]): ClientsOverview {
  return {
    totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    recentRevenue: rows.reduce((s, r) => s + r.recentRevenue, 0),
    activeClients: rows.filter((r) => r.totalRevenue > 0).length,
    totalOutstanding: rows.reduce((s, r) => s + r.outstanding, 0),
  };
}
