/**
 * Shared money-formatting utilities.
 * Consolidates the inline `toLocaleString('en-IN')` and custom `money()`
 * helpers that were scattered across import/format, reports/pdf,
 * clients/invoicePdf, budgets/derive, analytics, and dashboard components.
 */

/** Full money string for headline totals, e.g. "₹1,12,000" or "−₹84,250.50". */
export function formatMoneyCompact(amount: number): string {
  const sign = amount < 0 ? '\u2212' : '';
  const abs = Math.abs(amount);
  const hasPaise = Math.round(abs * 100) % 100 !== 0;
  return `${sign}\u20B9${abs.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a number as Indian-grouped rupees (no symbol, no sign). */
export function formatIndianNumber(n: number, fractionDigits?: number): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  });
}
