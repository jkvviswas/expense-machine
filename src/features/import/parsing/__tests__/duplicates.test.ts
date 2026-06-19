import { describe, it, expect } from 'vitest';
import { scanDuplicates } from '../duplicates';
import type { ParsedTransaction } from '../../types';
import type { Transaction } from '../../../transactions/types';

function makeParsed(overrides: Partial<ParsedTransaction> & { id: string; date: string; merchant: string; amount: number }): ParsedTransaction {
  return {
    description: 'Test',
    category: 'Food',
    confidence: 0.9,
    ...overrides,
  };
}

function makeExisting(overrides: Partial<Transaction> & { id: string; date: string; merchant: string; amount: number }): Transaction {
  return {
    description: 'Test',
    category: 'Food',
    accountId: 'acc-1',
    paymentMethod: 'UPI',
    ...overrides,
  };
}

describe('scanDuplicates', () => {
  it('returns empty when no existing transactions', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const result = scanDuplicates(parsed, []);
    expect(result.count).toBe(0);
    expect(result.matches.size).toBe(0);
  });

  it('returns empty when amounts do not match', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const existing = [makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'Swiggy', amount: -500 })];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(0);
  });

  it('detects exact same-day duplicate (same merchant, amount, date)', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const existing = [makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(1);
    const match = result.matches.get('p1');
    expect(match).toBeDefined();
    expect(match!.reason).toBe('exact');
    expect(match!.score).toBe(0.98);
  });

  it('detects near duplicate (date off by 1 day)', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-16', merchant: 'Swiggy', amount: -250 })];
    const existing = [makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(1);
    const match = result.matches.get('p1');
    expect(match!.reason).toBe('near');
    expect(match!.score).toBe(0.8);
  });

  it('does not flag as duplicate when date gap > 1 day', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-20', merchant: 'Swiggy', amount: -250 })];
    const existing = [makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(0);
  });

  it('does not flag when merchants differ', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 })];
    const existing = [makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'Zomato', amount: -250 })];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(0);
  });

  it('normalizes merchant names for comparison (case-insensitive, punctuation-stripped)', () => {
    const parsed = [makeParsed({ id: 'p1', date: '2026-01-15', merchant: 'SWIGGY FOODS', amount: -250 })];
    const existing = [makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'swiggy-foods', amount: -250 })];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(1);
  });

  it('handles multiple parsed transactions', () => {
    const parsed = [
      makeParsed({ id: 'p1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 }),
      makeParsed({ id: 'p2', date: '2026-01-16', merchant: 'Uber', amount: -150 }),
    ];
    const existing = [
      makeExisting({ id: 'e1', date: '2026-01-15', merchant: 'Swiggy', amount: -250 }),
    ];
    const result = scanDuplicates(parsed, existing);
    expect(result.count).toBe(1);
    expect(result.matches.has('p1')).toBe(true);
    expect(result.matches.has('p2')).toBe(false);
  });
});
