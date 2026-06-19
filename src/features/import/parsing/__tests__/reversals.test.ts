import { describe, it, expect } from 'vitest';
import { detectReversals } from '../reversals';
import type { ParsedTransaction } from '../../types';

function makeTxn(overrides: Partial<ParsedTransaction> & { id: string; date: string; merchant: string; amount: number }): ParsedTransaction {
  return {
    description: overrides.description ?? 'Test',
    category: 'Food',
    confidence: 0.9,
    ...overrides,
  };
}

describe('detectReversals', () => {
  it('returns empty when no reversals exist', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Swiggy', amount: -250 }),
      makeTxn({ id: 't2', date: '2026-01-12', merchant: 'Uber', amount: -150 }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(0);
  });

  it('detects a refund/reversal pair (same merchant, opposite amounts, within window)', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Swiggy', amount: -250 }),
      makeTxn({ id: 't2', date: '2026-01-12', merchant: 'Swiggy', amount: 250 }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(1);
    const match = result.matches.get('t2');
    expect(match).toBeDefined();
    expect(match!.debitId).toBe('t1');
    expect(match!.creditId).toBe('t2');
    expect(match!.score).toBeGreaterThanOrEqual(0.7);
  });

  it('boosts confidence when narration contains reversal keyword', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Amazon', amount: -500 }),
      makeTxn({ id: 't2', date: '2026-01-12', merchant: 'Amazon', amount: 500, description: 'Refund for order' }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(1);
    const match = result.matches.get('t2');
    expect(match!.score).toBeGreaterThan(0.85);
  });

  it('does not match when date gap exceeds 7 days', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-01', merchant: 'Swiggy', amount: -250 }),
      makeTxn({ id: 't2', date: '2026-01-15', merchant: 'Swiggy', amount: 250 }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(0);
  });

  it('does not match when amounts differ', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Swiggy', amount: -250 }),
      makeTxn({ id: 't2', date: '2026-01-12', merchant: 'Swiggy', amount: 300 }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(0);
  });

  it('does not match when merchants differ and no reversal keyword', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Swiggy', amount: -250 }),
      makeTxn({ id: 't2', date: '2026-01-12', merchant: 'Zomato', amount: 250 }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(0);
  });

  it('matches even with different merchants if reversal keyword present', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Shop A', amount: -500 }),
      makeTxn({ id: 't2', date: '2026-01-12', merchant: 'Bank Reversal', amount: 500, description: 'Reversal of POS charge' }),
    ];
    const result = detectReversals(parsed);
    expect(result.count).toBe(1);
  });

  it('uses each debit only once (no double-matching)', () => {
    const parsed = [
      makeTxn({ id: 't1', date: '2026-01-10', merchant: 'Swiggy', amount: -250 }),
      makeTxn({ id: 't2', date: '2026-01-11', merchant: 'Swiggy', amount: 250 }),
      makeTxn({ id: 't3', date: '2026-01-12', merchant: 'Swiggy', amount: 250 }),
    ];
    const result = detectReversals(parsed);
    // Only one credit should match the single debit
    expect(result.count).toBe(1);
  });
});
