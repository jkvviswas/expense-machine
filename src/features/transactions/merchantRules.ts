import { persist, STORAGE_KEYS } from '../../lib/persist';
import type { Category } from './types';

/**
 * Merchant learning: a persisted map of normalized merchant name → category.
 * When the user categorizes a merchant, the rule is remembered and applied to
 * every current matching transaction immediately, and to future imports.
 */

export type MerchantRules = Record<string, Category>;

// Generic suffix tokens that don't change merchant identity (domain/locale/
// entity-type noise). Stripped iteratively so "Netflix.com" / "Netflix India"
// / "Netflix" all normalize to the same key for merchant learning.
const GENERIC_SUFFIXES = new Set([
  'com', 'in', 'india', 'co', 'ltd', 'limited', 'pvt', 'private', 'inc',
  'llc', 'online', 'app', 'store',
]);

export function normMerchant(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  while (parts.length > 1 && GENERIC_SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts.join(' ');
}

let rules: MerchantRules = persist.read<MerchantRules>(STORAGE_KEYS.merchantRules, {}) ?? {};

export const merchantRules = {
  all(): MerchantRules {
    return rules;
  },
  get(merchant: string): Category | undefined {
    return rules[normMerchant(merchant)];
  },
  set(merchant: string, category: Category) {
    rules = { ...rules, [normMerchant(merchant)]: category };
    persist.write(STORAGE_KEYS.merchantRules, rules);
  },
  clear(merchant: string) {
    const next = { ...rules };
    delete next[normMerchant(merchant)];
    rules = next;
    persist.write(STORAGE_KEYS.merchantRules, rules);
  },
};
