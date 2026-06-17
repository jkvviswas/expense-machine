import { transactionsStore } from '../transactions/store';
import { clientsStore, invoiceTotal, type Invoice, type Client } from './store';
import type { Transaction } from '../transactions/types';

/**
 * ============================================================================
 *  CLIENT ↔ INVOICE ↔ LEDGER ENGINE  (Phases 4–5)
 * ============================================================================
 *
 * Marking an invoice paid (fully or partially) records a matching INCOME
 * transaction on the shared ledger, so Dashboard / Reports / Analytics / Clients
 * all reflect the revenue through the single source of truth. The client's
 * matchers are extended with the invoice number + client name so the income is
 * attributed back to that client by clients/derive.ts.
 */

function clientFor(invoice: Invoice): Client | undefined {
  return clientsStore.get().clients.find((c) => c.id === invoice.clientId);
}

/**
 * Record a payment for an invoice: updates invoice paid/partial status AND adds
 * an income transaction to the ledger. `amount` defaults to the full remaining
 * balance (→ marks Paid); a smaller amount marks the invoice Partial.
 */
export function payInvoice(invoice: Invoice, amount?: number) {
  const total = invoiceTotal(invoice);
  const alreadyPaid = invoice.paidAmount ?? 0;
  const remaining = Math.max(0, total - alreadyPaid);
  const pay = amount != null ? Math.min(amount, remaining) : remaining;
  if (pay <= 0) return;

  const client = clientFor(invoice);
  const label = client?.name ?? 'Client';

  // 1) Ledger income (single source of truth for all revenue surfaces).
  transactionsStore.add({
    date: new Date().toISOString().slice(0, 10),
    merchant: label,
    description: `Invoice ${invoice.number} payment`,
    amount: Math.abs(pay),
    category: 'Income',
    accountId: 'manual',
    paymentMethod: 'NEFT',
    notes: `Payment for ${invoice.number}`,
    confidence: 1,
    edited: true,
  });

  // 2) Ensure the income is attributed back to the client by adding the
  //    invoice number + client name to the client's matchers (deduped).
  if (client) {
    const extra = [invoice.number.toLowerCase(), client.name.toLowerCase()];
    const matchers = [...new Set([...client.matchers, ...extra])];
    clientsStore.updateClient(client.id, { matchers });
  }

  // 3) Update invoice paid amount + status (partial/paid).
  clientsStore.recordPayment(invoice.id, pay, total);
}

export interface PaymentMatch {
  invoice: Invoice;
  client: Client;
  score: number; // 0–1 confidence
}

/**
 * Suggest invoice matches for an imported income transaction (Phase 4). Looks
 * for unpaid/partial invoices whose client name (or matchers) appear in the
 * transaction text, optionally boosted when the amount matches the balance.
 */
export function suggestInvoiceMatches(txn: Transaction): PaymentMatch[] {
  if (txn.amount <= 0) return []; // only incoming payments
  const { clients, invoices } = clientsStore.get();
  const hay = `${txn.merchant} ${txn.description} ${txn.notes ?? ''}`.toLowerCase();

  const matches: PaymentMatch[] = [];
  for (const invoice of invoices) {
    if (invoice.status === 'paid') continue;
    const client = clients.find((c) => c.id === invoice.clientId);
    if (!client) continue;

    const nameHit =
      hay.includes(client.name.toLowerCase()) ||
      (client.company ? hay.includes(client.company.toLowerCase()) : false) ||
      client.matchers.some((m) => m && hay.includes(m.toLowerCase()));
    if (!nameHit) continue;

    const balance = Math.max(0, invoiceTotal(invoice) - (invoice.paidAmount ?? 0));
    const amountHit = Math.abs(Math.abs(txn.amount) - balance) < 1;
    matches.push({ invoice, client, score: amountHit ? 0.98 : 0.7 });
  }
  return matches.sort((a, b) => b.score - a.score);
}
