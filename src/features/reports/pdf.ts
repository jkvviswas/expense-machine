import { jsPDF } from 'jspdf';
import type { Transaction } from '../transactions/types';
import type { MonthlyReport } from './derive';
import { categoryBudgets, type CategoryBudget } from '../budgets/derive';
import { budgetStore } from '../budgets/store';
import { naturalInsights } from '../analytics/behaviour';
import { merchantInsights } from '../analytics/derive';
import { interRegular, interSemiBold, frauncesRegular, frauncesMedium } from './fonts';

/**
 * REAL PDF GENERATION (presentation only — no report math).
 * Genuine multi-page .pdf via jsPDF, with embedded Inter + Fraunces (so the ₹
 * glyph renders and typography matches the web app), the Expense Machine
 * dark-luxury palette, and visual intelligence (doughnut, rankings, cards).
 */

type RGB = [number, number, number];
const C = {
  void: [11, 10, 9] as RGB, ground: [19, 17, 15] as RGB, surface: [26, 23, 20] as RGB,
  elevated: [34, 30, 26] as RGB, hairline: [44, 39, 34] as RGB, hairlineStrong: [58, 52, 45] as RGB,
  bright: [243, 237, 227] as RGB, soft: [200, 191, 176] as RGB, muted: [138, 129, 117] as RGB,
  faint: [95, 87, 77] as RGB, brass: [201, 165, 103] as RGB, brassBright: [227, 196, 137] as RGB,
  brassDeep: [138, 113, 66] as RGB, gain: [127, 163, 130] as RGB, loss: [192, 133, 113] as RGB,
};
const CAT_TONES: RGB[] = [
  [201, 165, 103], [138, 113, 66], [200, 191, 176], [227, 196, 137],
  [138, 129, 117], [127, 163, 130], [192, 133, 113],
];

const PAGE_W = 210, PAGE_H = 297, MARGIN = 18, CONTENT_W = PAGE_W - MARGIN * 2;
const money = (n: number) => `${n < 0 ? '-' : ''}\u20B9${Math.abs(n).toLocaleString('en-IN')}`;
function fill(d: jsPDF, c: RGB) { d.setFillColor(c[0], c[1], c[2]); }
function stroke(d: jsPDF, c: RGB) { d.setDrawColor(c[0], c[1], c[2]); }
function text(d: jsPDF, c: RGB) { d.setTextColor(c[0], c[1], c[2]); }
const F = { sans: 'Inter', sansSemi: 'InterSemi', serif: 'Fraunces', serifMed: 'FrauncesMed' };

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS('Inter-Regular.ttf', interRegular); doc.addFont('Inter-Regular.ttf', F.sans, 'normal');
  doc.addFileToVFS('Inter-SemiBold.ttf', interSemiBold); doc.addFont('Inter-SemiBold.ttf', F.sansSemi, 'normal');
  doc.addFileToVFS('Fraunces-Regular.ttf', frauncesRegular); doc.addFont('Fraunces-Regular.ttf', F.serif, 'normal');
  doc.addFileToVFS('Fraunces-Medium.ttf', frauncesMedium); doc.addFont('Fraunces-Medium.ttf', F.serifMed, 'normal');
}

function drawDonutSegment(doc: jsPDF, cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
  const steps = Math.max(2, Math.ceil((a1 - a0) / 4));
  const toRad = (d: number) => (d * Math.PI) / 180;
  for (let i = 0; i < steps; i++) {
    const t0 = toRad(a0 + ((a1 - a0) * i) / steps), t1 = toRad(a0 + ((a1 - a0) * (i + 1)) / steps);
    const x1 = cx + rOut * Math.cos(t0), y1 = cy + rOut * Math.sin(t0);
    const x2 = cx + rOut * Math.cos(t1), y2 = cy + rOut * Math.sin(t1);
    const x3 = cx + rIn * Math.cos(t1), y3 = cy + rIn * Math.sin(t1);
    const x4 = cx + rIn * Math.cos(t0), y4 = cy + rIn * Math.sin(t0);
    doc.triangle(x1, y1, x2, y2, x3, y3, 'F');
    doc.triangle(x1, y1, x3, y3, x4, y4, 'F');
  }
}

export function generateReportPdf(report: MonthlyReport, txns: Transaction[]): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  registerFonts(doc);
  doc.setProperties({ title: `Expense Machine — ${report.monthLabel} Report`, author: 'Expense Machine', subject: 'Monthly Financial Report' });

  const budgets = categoryBudgets(txns, budgetStore.getCaps());
  const insights = naturalInsights(txns);
  const merchants = merchantInsights(txns, 6);
  const monthExpenseCount = txns.filter((t) => t.date.slice(0, 7) === report.monthKey && t.amount < 0).length;
  const generatedOn = '5 June 2026';

  const canvas = () => { fill(doc, C.void); doc.rect(0, 0, PAGE_W, PAGE_H, 'F'); };
  const footer = () => {
    stroke(doc, C.hairline); doc.setLineWidth(0.2); doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont(F.sans, 'normal'); doc.setFontSize(7.5); text(doc, C.faint);
    doc.text('EXPENSE MACHINE', MARGIN, PAGE_H - 9);
    doc.text(`${report.monthLabel} Report`, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
  };
  const sectionHeader = (label: string, yy: number): number => {
    text(doc, C.brass); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(8);
    doc.text(label.toUpperCase(), MARGIN, yy, { charSpace: 0.8 });
    stroke(doc, C.brassDeep); doc.setLineWidth(0.3); doc.line(MARGIN, yy + 2.5, MARGIN + CONTENT_W, yy + 2.5);
    return yy + 11;
  };
  const pageTitle = (title: string, yy: number): number => {
    text(doc, C.bright); doc.setFont(F.serif, 'normal'); doc.setFontSize(26); doc.text(title, MARGIN, yy); return yy + 12;
  };

  // PAGE 1 — COVER
  canvas();
  stroke(doc, C.brassDeep); doc.setLineWidth(0.4); doc.circle(PAGE_W / 2, 96, 30, 'S');
  stroke(doc, C.hairline); doc.setLineWidth(0.2); doc.circle(PAGE_W / 2, 96, 25, 'S');
  text(doc, C.brass); doc.setFont(F.serif, 'normal'); doc.setFontSize(30); doc.text('M', PAGE_W / 2, 102, { align: 'center' });
  text(doc, C.bright); doc.setFont(F.serif, 'normal'); doc.setFontSize(13); doc.text('EXPENSE MACHINE', PAGE_W / 2, 150, { align: 'center', charSpace: 2 });
  text(doc, C.brass); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(9); doc.text('MONTHLY FINANCIAL REPORT', PAGE_W / 2, 162, { align: 'center', charSpace: 1.5 });
  text(doc, C.bright); doc.setFont(F.serifMed, 'normal'); doc.setFontSize(40); doc.text(report.monthLabel, PAGE_W / 2, 185, { align: 'center' });
  stroke(doc, C.hairline); doc.setLineWidth(0.2); doc.line(PAGE_W / 2 - 30, 197, PAGE_W / 2 + 30, 197);
  text(doc, C.muted); doc.setFont(F.sans, 'normal'); doc.setFontSize(9);
  doc.text(`Generated on ${generatedOn}`, PAGE_W / 2, 207, { align: 'center' });
  doc.text('Personal Financial Operating System', PAGE_W / 2, 213, { align: 'center' });
  text(doc, C.faint); doc.setFontSize(7.5); doc.text('CONFIDENTIAL  \u00B7  PREPARED FOR THE ACCOUNT HOLDER', PAGE_W / 2, PAGE_H - 20, { align: 'center', charSpace: 1 });

  // PAGE 2 — EXECUTIVE SUMMARY
  doc.addPage(); canvas(); footer();
  let y = pageTitle('Executive Summary', 30);
  text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(10);
  const narrative = `In ${report.monthLabel}, you brought in ${money(report.income)} and spent ${money(report.spending)}, ` +
    `keeping ${Math.round(report.savingsRate * 100)}% of your income. ` +
    `${report.categories[0] ? `${report.categories[0].category} was your heaviest category. ` : ''}` +
    `Your Safe-to-Spend position stands at ${money(report.safe)}.`;
  const wrapped = doc.splitTextToSize(narrative, CONTENT_W);
  doc.text(wrapped, MARGIN, y); y += wrapped.length * 5.5 + 8;
  const kpis = [
    { label: 'Total Income', value: money(report.income), tone: C.gain, status: 'Inflow' },
    { label: 'Total Spending', value: money(report.spending), tone: C.loss, status: 'Outflow' },
    { label: 'Net Savings', value: money(report.netSavings), tone: report.netSavings >= 0 ? C.gain : C.loss, status: report.netSavings >= 0 ? 'Positive' : 'Negative' },
    { label: 'Safe to Spend', value: money(report.safe), tone: C.brass, status: 'Available' },
    { label: 'Budget Health', value: `${report.budgetScore} / 100`, tone: report.budgetScore >= 75 ? C.gain : report.budgetScore >= 50 ? C.brass : C.loss, status: report.budgetScore >= 75 ? 'Healthy' : report.budgetScore >= 50 ? 'Watchful' : 'Strained' },
  ];
  const cardW = (CONTENT_W - 6) / 2, cardH = 30;
  kpis.forEach((k, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = MARGIN + col * (cardW + 6), cy = y + row * (cardH + 6);
    fill(doc, C.surface); stroke(doc, C.hairline); doc.setLineWidth(0.2); doc.roundedRect(cx, cy, cardW, cardH, 2.5, 2.5, 'FD');
    fill(doc, k.tone); doc.roundedRect(cx, cy, 1.4, cardH, 0.7, 0.7, 'F');
    text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7); doc.text(k.label.toUpperCase(), cx + 7, cy + 10, { charSpace: 0.6 });
    text(doc, k.tone); doc.setFont(F.sans, 'normal'); doc.setFontSize(17); doc.text(k.value, cx + 7, cy + 21);
    text(doc, C.muted); doc.setFont(F.sans, 'normal'); doc.setFontSize(7); doc.text(k.status.toUpperCase(), cx + cardW - 7, cy + 10, { align: 'right', charSpace: 0.4 });
  });

  // PAGE 3 — SPENDING ANALYSIS
  doc.addPage(); canvas(); footer();
  y = pageTitle('Spending Analysis', 30);
  y = sectionHeader('Spending distribution', y);
  const cats = report.categories.slice(0, 7);
  const totalSpend = cats.reduce((s, c) => s + c.amount, 0) || 1;
  const cxC = MARGIN + 32, cyC = y + 30, rOuter = 26, rInner = 15;
  let startAng = -90;
  cats.forEach((c, i) => { const sweep = (c.amount / totalSpend) * 360; drawDonutSegment(doc, cxC, cyC, rInner, rOuter, startAng, startAng + sweep, CAT_TONES[i % CAT_TONES.length]); startAng += sweep; });
  text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(6.5); doc.text('TOTAL', cxC, cyC - 2, { align: 'center', charSpace: 0.5 });
  text(doc, C.bright); doc.setFont(F.sans, 'normal'); doc.setFontSize(10); doc.text(money(report.spending), cxC, cyC + 4, { align: 'center' });
  let ly = y + 6; const lx = MARGIN + 72;
  cats.forEach((c, i) => {
    fill(doc, CAT_TONES[i % CAT_TONES.length]); doc.circle(lx + 1.5, ly - 1.2, 1.5, 'F');
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9); doc.text(c.category, lx + 6, ly);
    text(doc, C.bright); doc.text(money(c.amount), MARGIN + CONTENT_W, ly, { align: 'right' });
    text(doc, C.faint); doc.setFontSize(7.5); doc.text(`${Math.round(c.share * 100)}%`, MARGIN + CONTENT_W, ly + 4, { align: 'right' });
    ly += 9.5;
  });
  y = Math.max(cyC + rOuter + 16, ly + 6);
  y = sectionHeader('Category ranking', y);
  const maxCat = Math.max(...cats.map((c) => c.amount), 1);
  cats.slice(0, 3).forEach((c, i) => {
    text(doc, C.brass); doc.setFont(F.serifMed, 'normal'); doc.setFontSize(13); doc.text(`#${i + 1}`, MARGIN, y + 1);
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9.5); doc.text(c.category, MARGIN + 12, y - 1.5);
    text(doc, C.bright); doc.text(money(c.amount), MARGIN + CONTENT_W, y - 1.5, { align: 'right' });
    fill(doc, C.elevated); doc.roundedRect(MARGIN + 12, y + 1.5, CONTENT_W - 12, 2.4, 1.2, 1.2, 'F');
    fill(doc, CAT_TONES[i % CAT_TONES.length]); doc.roundedRect(MARGIN + 12, y + 1.5, (c.amount / maxCat) * (CONTENT_W - 12), 2.4, 1.2, 1.2, 'F');
    y += 13;
  });

  // PAGE 4 — BUDGET ANALYSIS
  doc.addPage(); canvas(); footer();
  y = pageTitle('Budget Analysis', 30);
  y = sectionHeader('Budget utilisation', y);
  budgets.forEach((b: CategoryBudget) => {
    const tone = b.status === 'over' ? C.loss : b.status === 'watch' ? C.brass : C.gain;
    const pct = Math.round(b.ratio * 100);
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9.5); doc.text(b.category, MARGIN, y);
    text(doc, C.muted); doc.setFontSize(8.5); doc.text(`${money(b.spent)} / ${money(b.cap)}`, MARGIN + CONTENT_W, y, { align: 'right' });
    const barY = y + 2.6;
    fill(doc, C.elevated); doc.roundedRect(MARGIN, barY, CONTENT_W, 2.6, 1.3, 1.3, 'F');
    fill(doc, tone); doc.roundedRect(MARGIN, barY, Math.min(b.ratio, 1) * CONTENT_W, 2.6, 1.3, 1.3, 'F');
    text(doc, tone); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7.5);
    const status = b.status === 'over' ? 'OVER BUDGET' : b.status === 'watch' ? 'APPROACHING' : 'ON TRACK';
    doc.text(`${status}  \u00B7  ${pct}%`, MARGIN, y + 10, { charSpace: 0.4 });
    text(doc, C.faint); doc.setFont(F.sans, 'normal'); doc.setFontSize(7.5);
    doc.text(b.remaining >= 0 ? `${money(b.remaining)} remaining` : `${money(Math.abs(b.remaining))} over`, MARGIN + CONTENT_W, y + 10, { align: 'right' });
    y += 15;
  });

  // PAGE 5 — TRANSACTION ANALYSIS
  doc.addPage(); canvas(); footer();
  y = pageTitle('Transaction Analysis', 30);
  y = sectionHeader('Merchant ranking', y);
  const maxM = Math.max(...merchants.map((m) => m.total), 1);
  merchants.forEach((m) => {
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9); doc.text(`${m.merchant}`, MARGIN, y);
    text(doc, C.faint); doc.setFontSize(7.5); doc.text(`${m.count}\u00D7`, MARGIN + 70, y);
    text(doc, C.bright); doc.setFont(F.sans, 'normal'); doc.setFontSize(9); doc.text(money(m.total), MARGIN + CONTENT_W, y, { align: 'right' });
    const barY = y + 2.2;
    fill(doc, C.elevated); doc.roundedRect(MARGIN, barY, CONTENT_W, 2, 1, 1, 'F');
    fill(doc, C.brassDeep); doc.roundedRect(MARGIN, barY, (m.total / maxM) * CONTENT_W, 2, 1, 1, 'F');
    y += 11;
  });
  y += 4;
  y = sectionHeader('Largest transactions', y);
  const rowH = 9;
  text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7);
  doc.text('MERCHANT', MARGIN + 3, y); doc.text('CATEGORY', MARGIN + 78, y); doc.text('AMOUNT', MARGIN + CONTENT_W - 3, y, { align: 'right' });
  y += 3;
  report.largestExpenses.forEach((t, i) => {
    if (i % 2 === 0) { fill(doc, C.surface); doc.rect(MARGIN, y - 1, CONTENT_W, rowH, 'F'); }
    text(doc, C.bright); doc.setFont(F.sans, 'normal'); doc.setFontSize(9); doc.text(t.merchant, MARGIN + 3, y + 4.5);
    text(doc, C.muted); doc.setFontSize(8.5); doc.text(t.category, MARGIN + 78, y + 4.5);
    text(doc, C.loss); doc.setFont(F.sans, 'normal'); doc.setFontSize(9); doc.text(money(t.amount), MARGIN + CONTENT_W - 3, y + 4.5, { align: 'right' });
    y += rowH;
  });

  // PAGE 6 — FINANCIAL INTELLIGENCE
  doc.addPage(); canvas(); footer();
  y = pageTitle('Financial Intelligence', 30);
  y = sectionHeader('Insights & observations', y);
  const titleFor = (id: string) => id === 'save' ? 'Savings strength' : id === 'riser' ? 'Rising category' : id === 'easer' ? 'Easing category' : id === 'habit' ? 'Spending habit' : id === 'avg' ? 'Transaction size' : 'Observation';
  insights.forEach((ins) => {
    const tone = ins.tone === 'gain' ? C.gain : ins.tone === 'loss' ? C.loss : C.brass;
    const lines = doc.splitTextToSize(ins.text, CONTENT_W - 16);
    const ch = 12 + lines.length * 5;
    fill(doc, C.surface); stroke(doc, C.hairline); doc.setLineWidth(0.2); doc.roundedRect(MARGIN, y, CONTENT_W, ch, 2.5, 2.5, 'FD');
    fill(doc, tone); doc.roundedRect(MARGIN, y, 1.4, ch, 0.7, 0.7, 'F');
    fill(doc, tone); doc.circle(MARGIN + 7, y + 8, 1.6, 'F');
    text(doc, C.bright); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(9.5); doc.text(titleFor(ins.id), MARGIN + 12, y + 9);
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9); doc.text(lines, MARGIN + 12, y + 15);
    y += ch + 5;
  });

  // PAGE 7 — APPENDIX
  doc.addPage(); canvas(); footer();
  y = pageTitle('Appendix', 30);
  y = sectionHeader('Data source & methodology', y);
  const appendix: [string, string][] = [
    ['Data source', 'Expense Machine ledger'], ['Reference month', report.monthLabel],
    ['Transactions in month', String(monthExpenseCount)], ['Currency', 'Indian Rupee (\u20B9)'],
    ['Generated on', generatedOn], ['Safe-to-Spend method', 'Remaining income \u2212 commitments \u2212 buffer'],
    ['Budget health', 'Headroom score, penalised for categories over limit'],
  ];
  appendix.forEach(([k, v]) => {
    text(doc, C.faint); doc.setFont(F.sansSemi, 'normal'); doc.setFontSize(7.5); doc.text(k.toUpperCase(), MARGIN, y, { charSpace: 0.4 });
    text(doc, C.soft); doc.setFont(F.sans, 'normal'); doc.setFontSize(9.5); doc.text(v, MARGIN + 55, y);
    y += 9;
  });

  // FINALIZE: real page numbers
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p); doc.setFont(F.sans, 'normal'); doc.setFontSize(7.5); text(doc, C.faint);
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
  }
  return doc;
}
