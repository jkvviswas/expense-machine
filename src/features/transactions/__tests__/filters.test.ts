import { describe, it, expect } from 'vitest';
import { applyFilters, sortTransactions, totals, activeFilterCount } from '../filters';
import type { Transaction, FilterState } from '../types';

function makeTxn(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    date: '2026-01-15',
    merchant: 'Test Merchant',
    description: 'Test description',
    amount: -100,
    category: 'Food',
    accountId: 'acc-1',
    paymentMethod: 'UPI',
    ...overrides,
  };
}

const baseFilters: FilterState = {
  query: '',
  category: 'all',
  accountId: 'all',
  type: 'all',
  dateWindow: 'all',
  sort: 'newest',
};

describe('applyFilters', () => {
  const txns = [
    makeTxn({ id: 't1', category: 'Food', amount: -500, date: '2026-01-15', merchant: 'Swiggy' }),
    makeTxn({ id: 't2', category: 'Transport', amount: -200, date: '2026-01-10', merchant: 'Uber' }),
    makeTxn({ id: 't3', category: 'Income', amount: 50000, date: '2026-01-05', merchant: 'ACME Corp' }),
  ];

  it('returns all transactions with no active filters', () => {
    const result = applyFilters(txns, baseFilters);
    expect(result).toHaveLength(3);
  });

  it('filters by category', () => {
    const result = applyFilters(txns, { ...baseFilters, category: 'Food' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });

  it('filters by type (expense)', () => {
    const result = applyFilters(txns, { ...baseFilters, type: 'expense' });
    expect(result).toHaveLength(2);
  });

  it('filters by type (income)', () => {
    const result = applyFilters(txns, { ...baseFilters, type: 'income' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t3');
  });

  it('filters by search query (merchant)', () => {
    const result = applyFilters(txns, { ...baseFilters, query: 'swiggy' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });

  it('filters by search query (description)', () => {
    const result = applyFilters(txns, { ...baseFilters, query: 'test' });
    expect(result).toHaveLength(3);
  });

  it('filters by accountId', () => {
    const txnsWithAccounts = [
      makeTxn({ id: 't1', accountId: 'acc-1' }),
      makeTxn({ id: 't2', accountId: 'acc-2' }),
    ];
    const result = applyFilters(txnsWithAccounts, { ...baseFilters, accountId: 'acc-2' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t2');
  });

  it('filters by thisMonth date window', () => {
    const now = new Date('2026-01-20T00:00:00');
    const txnsWithDates = [
      makeTxn({ id: 't1', date: '2026-01-15' }),
      makeTxn({ id: 't2', date: '2025-12-20' }),
    ];
    const result = applyFilters(txnsWithDates, { ...baseFilters, dateWindow: 'thisMonth' }, now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });

  it('filters by custom date range', () => {
    const result = applyFilters(txns, {
      ...baseFilters,
      dateWindow: 'custom',
      customFrom: '2026-01-10',
      customTo: '2026-01-15',
    });
    expect(result).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    const result = applyFilters(txns, { ...baseFilters, category: 'Food', type: 'expense' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });
});

describe('sortTransactions', () => {
  const txns = [
    makeTxn({ id: 't1', date: '2026-01-15', amount: -500 }),
    makeTxn({ id: 't2', date: '2026-01-10', amount: -200 }),
    makeTxn({ id: 't3', date: '2026-01-20', amount: -800 }),
  ];

  it('sorts newest first', () => {
    const sorted = sortTransactions(txns, 'newest');
    expect(sorted[0].id).toBe('t3');
    expect(sorted[1].id).toBe('t1');
    expect(sorted[2].id).toBe('t2');
  });

  it('sorts oldest first', () => {
    const sorted = sortTransactions(txns, 'oldest');
    expect(sorted[0].id).toBe('t2');
    expect(sorted[1].id).toBe('t1');
    expect(sorted[2].id).toBe('t3');
  });

  it('sorts by amount descending (largest positive first)', () => {
    const sorted = sortTransactions(txns, 'amountDesc');
    expect(sorted[0].id).toBe('t2'); // -200 is "largest"
    expect(sorted[2].id).toBe('t3'); // -800 is smallest
  });

  it('sorts by amount ascending (most negative first)', () => {
    const sorted = sortTransactions(txns, 'amountAsc');
    expect(sorted[0].id).toBe('t3'); // -800
    expect(sorted[2].id).toBe('t2'); // -200
  });

  it('does not mutate original array', () => {
    const original = [...txns];
    sortTransactions(txns, 'newest');
    expect(txns).toEqual(original);
  });
});

describe('totals', () => {
  it('computes inflow, outflow, net, and count', () => {
    const txns = [
      makeTxn({ id: 't1', amount: -500 }),
      makeTxn({ id: 't2', amount: -200 }),
      makeTxn({ id: 't3', amount: 1000 }),
    ];
    const result = totals(txns);
    expect(result.inflow).toBe(1000);
    expect(result.outflow).toBe(-700);
    expect(result.net).toBe(300);
    expect(result.count).toBe(3);
  });

  it('handles empty array', () => {
    const result = totals([]);
    expect(result.inflow).toBe(0);
    expect(result.outflow).toBe(0);
    expect(result.net).toBe(0);
    expect(result.count).toBe(0);
  });
});

describe('activeFilterCount', () => {
  it('returns 0 for default filters', () => {
    expect(activeFilterCount(baseFilters)).toBe(0);
  });

  it('counts active filters', () => {
    const f: FilterState = {
      ...baseFilters,
      category: 'Food',
      type: 'expense',
      dateWindow: 'thisMonth',
    };
    expect(activeFilterCount(f)).toBe(3);
  });
});
