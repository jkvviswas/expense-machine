/**
 * Shared ID generation.
 * Replaces the duplicated `${prefix}-${Date.now().toString(36)}-${Math.random()…}`
 * pattern found in every store (transactions, loans, commitments, accounts,
 * clients, notifications, import-history, balance-lock, auth, etc.).
 */

/** Generate a short, collision-resistant ID with a descriptive prefix. */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
