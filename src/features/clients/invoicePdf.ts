import { jsPDF } from 'jspdf';
import { interRegular, interSemiBold, frauncesRegular, frauncesMedium } from '../reports/fonts';
import {
  type Invoice,
  type Client,
  lineSubtotal,
  lineTax,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
} from './store';

/**
 * ============================================================================
 *  INVOICE PDF  (Phase 14 — presentation-layer, additive)
 * ============================================================================
 *
 * Generates a branded, single-page A4 invoice via jsPDF, reusing the SAME
 * embedded Inter + Fraunces fonts as the monthly report (so the ₹ glyph renders
 * correctly and the document matches the Dark-Editorial-Luxury identity, here
 * inverted to an ink-on-paper sheet appropriate for a document a client
 * receives). No locked file is touched; all figures come from the tax-aware
 * helpers in clients/store.ts so the PDF reconciles exactly with the UI.
 */

type RGB = [number, number, number];

const F = { sans: 'EMInter', sansSemi: 'EMInterSemi', serif: 'EMFraunces', serifMed: 'EMFrauncesMed' };

// Ink-on-paper palette (a printed invoice reads better light); brass accent kept.
const C = {
  ink: [26, 23, 20] as RGB,
  soft: [90, 82, 72] as RGB,
  faint: [140, 130, 118] as RGB,
  hair: [222, 216, 206] as RGB,
  brass: [150, 120, 60] as RGB,
  paper: [255, 255, 255] as RGB,
  band: [248, 245, 240] as RGB,
};

const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function money(n: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${neg ? '-' : ''}\u20B9${s}`;
}

function text(d: jsPDF, c: RGB) { d.setTextColor(c[0], c[1], c[2]); }
function fill(d: jsPDF, c: RGB) { d.setFillColor(c[0], c[1], c[2]); }
function stroke(d: jsPDF, c: RGB) { d.setDrawColor(c[0], c[1], c[2]); }

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS('EMInter.ttf', interRegular); doc.addFont('EMInter.ttf', F.sans, 'normal');
  doc.addFileToVFS('EMInterSemi.ttf', interSemiBold); doc.addFont('EMInterSemi.ttf', F.sansSemi, 'normal');
  doc.addFileToVFS('EMFraunces.ttf', frauncesRegular); doc.addFont('EMFraunces.ttf', F.serif, 'normal');
  doc.addFileToVFS('EMFrauncesMed.ttf', frauncesMedium); doc.addFont('EMFrauncesMed.ttf', F.serifMed, 'normal');
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function generateInvoicePdf(invoice: Invoice, client: Client): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  registerFonts(doc);

  // Brand mark + wordmark
  let y = MARGIN + 4;
  text(doc, C.brass); doc.setFont(F.serifMed, 'normal'); doc.setFontSize(22);
  doc.text('M', MARGIN, y);
  text(doc, C.ink); doc.setFont(F.serif, 'normal'); doc.setFontSize(13);
  doc.text('Expense Machine', MARGIN + 9, y - 1);
  text(doc, C.faint); doc.setFont(F.sans, 'normal'); doc.setFontSize(7.5);
  doc.text('Personal financial operating system', MARGIN + 9, y + 4, { charSpace: 0.2 });

  // INVOICE label + number (right)
  text(doc, C.brass); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(9);
  doc.text('INVOICE', PAGE_W - MARGIN, MARGIN + 1, { align: 'right', charSpace: 2 });
  text(doc, C.ink); doc.setFont(F.serifMed, 'normal'); doc.setFontSize(16);
  doc.text(invoice.number, PAGE_W - MARGIN, MARGIN + 9, { align: 'right' });

  y = MARGIN + 18;
  stroke(doc, C.hair); doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  // Bill-to + meta
  y += 9;
  text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7);
  doc.text('BILLED TO', MARGIN, y, { charSpace: 0.6 });
  doc.text('ISSUED', PAGE_W - MARGIN - 40, y, { charSpace: 0.6 });
  doc.text('DUE', PAGE_W - MARGIN, y, { align: 'right', charSpace: 0.6 });

  y += 6;
  text(doc, C.ink); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(11);
  doc.text(client.name, MARGIN, y);
  text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9);
  doc.text(fmtDate(invoice.issuedOn), PAGE_W - MARGIN - 40, y);
  doc.text(fmtDate(invoice.dueOn), PAGE_W - MARGIN, y, { align: 'right' });

  if (client.company) {
    y += 5;
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9);
    doc.text(client.company, MARGIN, y);
  }
  if (client.email) {
    y += 5;
    text(doc, C.faint); doc.setFont(F.sans, 'normal'); doc.setFontSize(8.5);
    doc.text(client.email, MARGIN, y);
  }

  // Line-item table
  y += 12;
  fill(doc, C.band);
  doc.rect(MARGIN, y - 5, CONTENT_W, 8, 'F');
  text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7);
  const colDesc = MARGIN + 3;
  const colQty = MARGIN + 96;
  const colRate = MARGIN + 120;
  const colTax = MARGIN + 146;
  const colAmt = PAGE_W - MARGIN - 3;
  doc.text('DESCRIPTION', colDesc, y, { charSpace: 0.5 });
  doc.text('QTY', colQty, y, { align: 'right', charSpace: 0.5 });
  doc.text('RATE', colRate, y, { align: 'right', charSpace: 0.5 });
  doc.text('TAX', colTax, y, { align: 'right', charSpace: 0.5 });
  doc.text('AMOUNT', colAmt, y, { align: 'right', charSpace: 0.5 });

  y += 8;
  doc.setFontSize(9);
  for (const line of invoice.lines) {
    text(doc, C.ink); doc.setFont(F.sans, 'normal');
    const descLines = doc.splitTextToSize(line.description || 'Item', 78) as string[];
    doc.text(descLines, colDesc, y);
    text(doc, C.soft);
    doc.text(String(line.quantity), colQty, y, { align: 'right' });
    doc.text(money(line.unitAmount), colRate, y, { align: 'right' });
    doc.text(line.taxRate ? `${line.taxRate}%` : '—', colTax, y, { align: 'right' });
    text(doc, C.ink); doc.setFont(F.sansSemi, 'normal');
    doc.text(money(lineSubtotal(line) + lineTax(line)), colAmt, y, { align: 'right' });
    const rowH = Math.max(7, descLines.length * 5 + 2);
    y += rowH;
    stroke(doc, C.hair); doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);
  }

  // Totals
  y += 4;
  const totalsX = PAGE_W - MARGIN - 60;
  const sub = invoiceSubtotal(invoice);
  const tax = invoiceTax(invoice);
  const grand = invoiceTotal(invoice);

  const totalRow = (label: string, value: string, bold = false) => {
    text(doc, bold ? C.ink : C.soft);
    doc.setFont(bold ? F.sansSemi : F.sans, 'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, totalsX, y);
    doc.text(value, colAmt, y, { align: 'right' });
    y += bold ? 8 : 6;
  };
  totalRow('Subtotal', money(sub));
  if (tax > 0) totalRow('Tax', money(tax));
  stroke(doc, C.hair); doc.setLineWidth(0.4);
  doc.line(totalsX, y - 2, PAGE_W - MARGIN, y - 2);
  y += 3;
  totalRow('Total due', money(grand), true);

  // Status chip
  const statusLabel = invoice.status.toUpperCase();
  text(doc, C.brass); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(8);
  doc.text(statusLabel, MARGIN, y - 6, { charSpace: 1 });

  // Notes
  if (invoice.notes) {
    y += 6;
    text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7);
    doc.text('NOTES', MARGIN, y, { charSpace: 0.6 });
    y += 5;
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(8.5);
    const noteLines = doc.splitTextToSize(invoice.notes, CONTENT_W) as string[];
    doc.text(noteLines, MARGIN, y);
  }

  // Footer
  text(doc, C.faint); doc.setFont(F.sans, 'normal'); doc.setFontSize(7.5);
  doc.text(
    'Generated by Expense Machine \u00B7 Thank you for your business',
    PAGE_W / 2,
    287,
    { align: 'center', charSpace: 0.4 },
  );

  return doc;
}

/** Trigger a browser download of the invoice PDF. */
export function downloadInvoicePdf(invoice: Invoice, client: Client) {
  const doc = generateInvoicePdf(invoice, client);
  doc.save(`${invoice.number}.pdf`);
}
