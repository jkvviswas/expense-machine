import type { Transaction } from './types';
import { accountById } from './data';

/**
 * Export transactions to a real .xlsx file with proper date formatting and
 * column widths, so dates never appear as "########" the way a raw CSV can when
 * Excel auto-detects a too-narrow date column.
 *
 * This is presentation-only and additive — it does not touch the accounting
 * engine (the locked `toCSV` in filters.ts stays as-is for plain CSV needs).
 */
export async function exportTransactionsXlsx(
  txns: Transaction[],
  filename = 'expense-machine-transactions.xlsx',
): Promise<void> {
  const XLSX = await import('xlsx');

  const header = ['Date', 'Merchant', 'Description', 'Category', 'Account', 'Payment Method', 'Amount (INR)'];

  // Newest first for a friendlier export.
  const sorted = [...txns].sort((a, b) => (a.date < b.date ? 1 : -1));

  const rows = sorted.map((t) => {
    const acct = accountById(t.accountId);
    return [
      formatIsoDate(t.date),                            // human-readable text, always correct
      t.merchant,
      t.description,
      t.category,
      acct ? `${acct.label} ${acct.mask}` : t.accountId,
      t.paymentMethod,
      Number(t.amount.toFixed(2)),                      // real number → right-aligned, summable
    ];
  });

  const aoa: (string | number)[][] = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths (characters) — the Date column is wide enough to never clip.
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 24 }, // Merchant
    { wch: 32 }, // Description
    { wch: 16 }, // Category
    { wch: 20 }, // Account
    { wch: 16 }, // Payment Method
    { wch: 15 }, // Amount
  ];

  // Format only the Amount column (G) as a 2-decimal number. The date column is
  // already a clean string, so it always displays correctly — no 1970, no ####.
  for (let i = 0; i < rows.length; i++) {
    const r = i + 2; // 1-based; row 1 is the header
    const amtCell = ws[`G${r}`];
    if (amtCell) {
      amtCell.t = 'n';
      amtCell.z = '#,##0.00';
    }
  }

  // Freeze the header row and add an auto-filter.
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  ws['!autofilter'] = { ref: `A1:G${rows.length + 1}` };

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: 'Expense Machine — Transactions', Author: 'Expense Machine', CreatedDate: new Date() };
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, filename);
}

/** Turn an ISO 'yyyy-mm-dd' into a readable '18 Jun 2026'. Robust to bad input. */
function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return iso ?? '';
  const [, y, mo, d] = m;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = Number(mo) - 1;
  if (mi < 0 || mi > 11) return iso;
  return `${d} ${months[mi]} ${y}`;
}
