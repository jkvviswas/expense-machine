/**
 * Shared date utilities used across the app.
 * Centralizes month-key extraction, same-month checks, reference "now",
 * ISO date formatting, and today-as-ISO helpers that were previously
 * duplicated in dashboard/derive, budgets/derive, analytics/derive,
 * analytics/behaviour, analytics/forecast, analytics/intelligence,
 * reports/derive, and various component files.
 */

/** The reference "now" used by derivation layers that need a stable timestamp. */
export const REFERENCE_NOW = new Date();

/** Extract the "yyyy-mm" month key from an ISO date string. */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Check whether an ISO date falls in the same calendar month as a reference Date. */
export function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso + 'T00:00:00');
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

/** Today as an ISO "yyyy-mm-dd" string. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
