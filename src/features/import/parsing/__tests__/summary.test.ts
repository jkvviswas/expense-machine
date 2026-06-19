import { describe, it, expect } from 'vitest';
import { summarizeExtraction } from '../summary';
import type { ParsedTransaction } from '../../types';

function makeTxn(overrides: Partial<ParsedTransaction> & { id: string }): ParsedTransaction {
  return {
    date: '2026-01-15',
    merchant: 'Test Merchant',
    description: 'Test description',
    amount: -100,
    category: 'Food',
    confidence: 0.9,
    ...overrides,
  };
}

describe('summarizeExtraction', () => {
  it('computes correct count', () => {
    const txns = [
      makeTxn({ id: 't1' }),
      makeTxn({ id: 't2' }),
      makeTxn({ id: 't3' }),
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.count).toBe(3);
  });

  it('separates inflow and outflow', () => {
    const txns = [
      makeTxn({ id: 't1', amount: -500 }),
      makeTxn({ id: 't2', amount: -200 }),
      makeTxn({ id: 't3', amount: 1000, category: 'Income' }),
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.inflow).toBe(1000);
    expect(summary.outflow).toBe(-700);
    expect(summary.net).toBe(300);
  });

  it('computes category breakdown sorted by absolute amount', () => {
    const txns = [
      makeTxn({ id: 't1', amount: -500, category: 'Shopping' }),
      makeTxn({ id: 't2', amount: -200, category: 'Food' }),
      makeTxn({ id: 't3', amount: -800, category: 'Transport' }),
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.categoryBreakdown[0].category).toBe('Transport');
    expect(summary.categoryBreakdown[1].category).toBe('Shopping');
    expect(summary.categoryBreakdown[2].category).toBe('Food');
  });

  it('computes category share relative to total outflow', () => {
    const txns = [
      makeTxn({ id: 't1', amount: -600, category: 'Food' }),
      makeTxn({ id: 't2', amount: -400, category: 'Transport' }),
    ];
    const summary = summarizeExtraction(txns);
    const food = summary.categoryBreakdown.find((c) => c.category === 'Food');
    expect(food!.share).toBeCloseTo(0.6);
  });

  it('identifies top merchants by absolute spend', () => {
    const txns = [
      makeTxn({ id: 't1', amount: -500, merchant: 'Swiggy' }),
      makeTxn({ id: 't2', amount: -200, merchant: 'Uber' }),
      makeTxn({ id: 't3', amount: -300, merchant: 'Swiggy' }),
      makeTxn({ id: 't4', amount: -100, merchant: 'Netflix' }),
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.topMerchants[0].merchant).toBe('Swiggy');
    expect(summary.topMerchants[0].total).toBe(-800);
    expect(summary.topMerchants[0].count).toBe(2);
  });

  it('limits top merchants to 5', () => {
    const txns = Array.from({ length: 10 }, (_, i) =>
      makeTxn({ id: `t${i}`, amount: -(i + 1) * 100, merchant: `Merchant ${i}` }),
    );
    const summary = summarizeExtraction(txns);
    expect(summary.topMerchants.length).toBe(5);
  });

  it('computes average confidence for non-edited rows', () => {
    const txns = [
      makeTxn({ id: 't1', confidence: 0.8 }),
      makeTxn({ id: 't2', confidence: 0.6 }),
      makeTxn({ id: 't3', confidence: 1.0, edited: true }), // excluded from avg
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.confidence).toBeCloseTo(0.7);
  });

  it('identifies transactions needing review', () => {
    const txns = [
      makeTxn({ id: 't1', confidence: 0.9 }),
      makeTxn({ id: 't2', confidence: 0.4 }), // below threshold
      makeTxn({ id: 't3', category: 'Uncategorized', confidence: 0.8 }), // uncategorized
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.needsReview).toHaveLength(2);
  });

  it('computes correct date range', () => {
    const txns = [
      makeTxn({ id: 't1', date: '2026-01-20' }),
      makeTxn({ id: 't2', date: '2026-01-05' }),
      makeTxn({ id: 't3', date: '2026-01-15' }),
    ];
    const summary = summarizeExtraction(txns);
    expect(summary.dateRangeStart).toBe('2026-01-05');
    expect(summary.dateRangeEnd).toBe('2026-01-20');
  });

  it('handles empty input', () => {
    const summary = summarizeExtraction([]);
    expect(summary.count).toBe(0);
    expect(summary.inflow).toBe(0);
    expect(summary.outflow).toBe(0);
    expect(summary.net).toBe(0);
    expect(summary.categoryBreakdown).toHaveLength(0);
    expect(summary.topMerchants).toHaveLength(0);
  });
});
