import type { Transaction } from '../transactions/types';
import type { WorkSheet } from 'xlsx';
import type { MonthlyReport } from './derive';
import { categoryBudgets } from '../budgets/derive';
import { budgetStore } from '../budgets/store';
import { naturalInsights } from '../analytics/behaviour';
import { accountById } from '../transactions/data';

/**
 * EXPORT LAYER (presentation only — no report math).
 * Excel: a professional 5-sheet workbook suitable for a CA / auditor.
 * PDF: a genuine multi-page branded .pdf via jsPDF.
 *
 * BUNDLE NOTE: `xlsx` (SheetJS) and the jsPDF-based `./pdf` engine are heavy and
 * only needed when the user actually exports. They are loaded via dynamic
 * import() INSIDE the export methods, so neither ships in the initial bundle.
 */

export interface ReportExporter {
  readonly format: 'xlsx' | 'pdf';
  readonly label: string;
  export(report: MonthlyReport, txns: Transaction[]): void | Promise<void>;
}

const INR = '₹#,##0';
const INR_NEG = '₹#,##0;[Red]-₹#,##0';
const PCT = '0%';

function setCols(ws: WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}
function fmt(ws: WorkSheet, addr: string, z: string) {
  if (ws[addr]) ws[addr].z = z;
}
function freeze(ws: WorkSheet, rows: number) {
  ws['!freeze'] = { xSplit: 0, ySplit: rows } as unknown as WorkSheet['!freeze'];
}
function mergeTitle(ws: WorkSheet, cols: number, rows = 2) {
  ws['!merges'] = ws['!merges'] ?? [];
  for (let r = 0; r < rows; r++) {
    ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: cols - 1 } });
  }
}

export const xlsxExporter: ReportExporter = {
  format: 'xlsx',
  label: 'Export Excel',
  async export(report, txns) {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    wb.Props = { Title: `Expense Machine — ${report.monthLabel} Report`, Author: 'Expense Machine', CreatedDate: new Date() };

    const budgets = categoryBudgets(txns, budgetStore.getCaps());
    const insights = naturalInsights(txns);
    const monthTxns = txns
      .filter((t) => t.date.slice(0, 7) === report.monthKey)
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    /* 1. Executive Summary */
    const s1: (string | number)[][] = [
      ['EXPENSE MACHINE'],
      [`Monthly Financial Report — ${report.monthLabel}`],
      [],
      ['Metric', 'Value'],
      ['Total income', report.income],
      ['Total spending', report.spending],
      ['Net savings', report.netSavings],
      ['Savings rate', report.savingsRate],
      ['Safe to spend', report.safe],
      ['Budget health (/100)', report.budgetScore],
      ['Generated on', '5 June 2026'],
      ['Reference month', report.monthLabel],
      ['Data source', 'Expense Machine ledger'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    setCols(ws1, [28, 20]);
    mergeTitle(ws1, 2);
    ['B5', 'B6', 'B7', 'B9'].forEach((a) => fmt(ws1, a, INR));
    fmt(ws1, 'B8', PCT);
    freeze(ws1, 4);
    XLSX.utils.book_append_sheet(wb, ws1, 'Executive Summary');

    /* 2. Transactions (with totals row + filter + freeze) */
    const txHeader = ['Date', 'Merchant', 'Description', 'Category', 'Account', 'Type', 'Amount'];
    const txRows = monthTxns.map((t) => [
      new Date(t.date + 'T00:00:00'),
      t.merchant,
      t.description,
      t.category,
      accountById(t.accountId)?.label ?? t.accountId,
      t.amount >= 0 ? 'Income' : 'Expense',
      t.amount,
    ]);
    const totalNet = monthTxns.reduce((s, t) => s + t.amount, 0);
    const s2: (string | number | Date)[][] = [
      ['EXPENSE MACHINE'],
      [`Transactions — ${report.monthLabel}`],
      [],
      txHeader,
      ...txRows,
      [],
      ['', '', '', '', '', 'Net total', totalNet],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    setCols(ws2, [13, 22, 30, 15, 16, 10, 14]);
    mergeTitle(ws2, 7);
    for (let i = 0; i < monthTxns.length; i++) {
      fmt(ws2, `A${5 + i}`, 'dd mmm yyyy');
      fmt(ws2, `G${5 + i}`, INR_NEG);
    }
    const totalRow = 5 + monthTxns.length + 1;
    fmt(ws2, `G${totalRow}`, INR_NEG);
    freeze(ws2, 4);
    ws2['!autofilter'] = { ref: `A4:G${4 + monthTxns.length}` };
    XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');

    /* 3. Category Analysis */
    const s3: (string | number)[][] = [
      ['Category Analysis', '', ''],
      ['Category', 'Amount', 'Share'],
      ...report.categories.map((c) => [c.category, c.amount, c.share]),
      [],
      ['Total', report.spending, 1],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(s3);
    setCols(ws3, [20, 16, 10]);
    mergeTitle(ws3, 3, 1);
    for (let i = 0; i < report.categories.length; i++) {
      fmt(ws3, `B${3 + i}`, INR);
      fmt(ws3, `C${3 + i}`, PCT);
    }
    const catTotal = 3 + report.categories.length + 1;
    fmt(ws3, `B${catTotal}`, INR);
    fmt(ws3, `C${catTotal}`, PCT);
    freeze(ws3, 2);
    ws3['!autofilter'] = { ref: `A2:C${2 + report.categories.length}` };
    XLSX.utils.book_append_sheet(wb, ws3, 'Category Analysis');

    /* 4. Budget Analysis */
    const s4: (string | number)[][] = [
      ['Budget Analysis', '', '', '', ''],
      ['Category', 'Budget', 'Spent', 'Remaining', 'Status'],
      ...budgets.map((b) => [
        b.category, b.cap, b.spent, b.remaining,
        b.status === 'over' ? 'Over' : b.status === 'watch' ? 'Approaching' : 'On track',
      ]),
      [],
      ['Total', budgets.reduce((s, b) => s + b.cap, 0), budgets.reduce((s, b) => s + b.spent, 0), budgets.reduce((s, b) => s + b.remaining, 0), ''],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(s4);
    setCols(ws4, [18, 14, 14, 14, 14]);
    mergeTitle(ws4, 5, 1);
    for (let i = 0; i < budgets.length; i++) {
      ['B', 'C', 'D'].forEach((col) => fmt(ws4, `${col}${3 + i}`, INR));
    }
    const budTotal = 3 + budgets.length + 1;
    ['B', 'C', 'D'].forEach((col) => fmt(ws4, `${col}${budTotal}`, INR));
    freeze(ws4, 2);
    ws4['!autofilter'] = { ref: `A2:E${2 + budgets.length}` };
    XLSX.utils.book_append_sheet(wb, ws4, 'Budget Analysis');

    /* 5. Financial Insights */
    const s5: (string | number)[][] = [
      ['Financial Insights', ''],
      ['#', 'Observation'],
      ...insights.map((ins, i) => [i + 1, ins.text]),
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(s5);
    setCols(ws5, [5, 90]);
    mergeTitle(ws5, 2, 1);
    freeze(ws5, 2);
    XLSX.utils.book_append_sheet(wb, ws5, 'Financial Insights');

    XLSX.writeFile(wb, `expense-machine-report-${report.monthKey}.xlsx`, { cellStyles: true });
  },
};

/* ---------- PDF (REAL .pdf via jsPDF) ---------- */

export const pdfExporter: ReportExporter = {
  format: 'pdf',
  label: 'Export PDF',
  async export(report, txns) {
    const { generateReportPdf } = await import('./pdf');
    const doc = generateReportPdf(report, txns);
    doc.save(`expense-machine-report-${report.monthKey}.pdf`);
  },
};

export const exporters: ReportExporter[] = [xlsxExporter, pdfExporter];
