import type { Category } from './types';
import { categoriesStore } from '../transactions/categories';

/**
 * India-first formatting. All currency uses ₹ and the en-IN locale, which
 * applies the Indian grouping system (lakh/crore): ₹1,25,000 / ₹12,50,000.
 */

/**
 * Money split for the tabular treatment. Indian statements are typically in
 * whole rupees; paise are shown only when present so figures stay clean.
 */
export function formatMoney(amount: number): {
  whole: string;
  paise: string | null;
  sign: string;
} {
  const sign = amount < 0 ? '−' : '';
  const abs = Math.abs(amount);
  const whole = Math.trunc(abs);
  const paise = Math.round((abs - whole) * 100);
  const grouped = whole.toLocaleString('en-IN');
  return {
    whole: grouped,
    paise: paise > 0 ? String(paise).padStart(2, '0') : null,
    sign,
  };
}

/** Full money for headline totals, e.g. ₹1,12,000 or ₹84,250.50 */
export function formatMoneyFull(amount: number): string {
  const sign = amount < 0 ? '−' : '';
  const abs = Math.abs(amount);
  const hasPaise = Math.round(abs * 100) % 100 !== 0;
  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso + 'T00:00:00');
  const e = new Date(endIso + 'T00:00:00');
  const sLabel = s.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  const eLabel = e.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${sLabel} – ${eLabel}`;
}

/**
 * Category dot tone. Strictly inside the locked palette: a single hue family
 * at varied warmth, never a rainbow. Income/Investments lean to the money
 * "gain" sage; spending uses warm neutrals and the brass family.
 */
export const categoryTone: Record<Category, string> = {
  Income: 'var(--em-gain)',
  Salary: 'var(--em-gain)',
  Freelance: 'var(--em-gain)',
  Investments: 'var(--em-gain)',
  Loans: 'var(--em-loss)',
  Food: 'var(--em-brass)',
  Groceries: 'var(--em-brass)',
  Transport: 'var(--em-soft)',
  Fuel: 'var(--em-soft)',
  Shopping: 'var(--em-brass-bright)',
  Utilities: 'var(--em-muted)',
  Bills: 'var(--em-muted)',
  Rent: 'var(--em-muted)',
  Entertainment: 'var(--em-brass-deep)',
  Healthcare: 'var(--em-loss)',
  Medical: 'var(--em-loss)',
  Education: 'var(--em-soft)',
  Travel: 'var(--em-brass-bright)',
  Insurance: 'var(--em-muted)',
  Tax: 'var(--em-loss)',
  Uncategorized: 'var(--em-faint)',
  Others: 'var(--em-faint)',
};

/** Palette-safe tones for custom categories, chosen deterministically by name. */
const CUSTOM_TONES = [
  'var(--em-brass)',
  'var(--em-brass-bright)',
  'var(--em-brass-deep)',
  'var(--em-soft)',
  'var(--em-muted)',
  'var(--em-gain)',
];

/**
 * Resolve a tone for ANY category string — built-in or user-created. Built-ins
 * use the curated map; custom categories get a stable palette colour derived
 * from their name, so they render consistently everywhere without breaking.
 */
export function toneFor(category: string): string {
  if (category in categoryTone) return categoryTone[category as Category];
  const custom = categoriesStore.custom().find((c) => c.name === category);
  if (custom?.color) return custom.color;
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return CUSTOM_TONES[h % CUSTOM_TONES.length];
}

/** Confidence -> label + tone, all within palette. */
export function confidenceBand(c: number): { label: string; tone: string } {
  if (c >= 0.9) return { label: 'High', tone: 'var(--em-gain)' };
  if (c >= 0.7) return { label: 'Likely', tone: 'var(--em-brass)' };
  return { label: 'Review', tone: 'var(--em-loss)' };
}
