import { describe, it, expect } from 'vitest';
import { validateImport } from '../validation';
import type { ParsedTransaction } from '../../types';

function makeTxn(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    id: 'txn-1',
    date: '2026-01-15',
    merchant: 'Swiggy',
    description: 'Swiggy order',
    amount: -250,
    category: 'Food',
    confidence: 0.9,
    ...overrides,
  };
}

describe('validateImport', () => {
  it('returns no issues for valid transactions', () => {
    const txns = [makeTxn()];
    const report = validateImport(txns);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
    expect(report.issues).toHaveLength(0);
  });

  it('flags transactions with invalid dates', () => {
    const txns = [makeTxn({ id: 'bad-date', date: 'not-a-date' })];
    const report = validateImport(txns);
    expect(report.errorCount).toBe(1);
    expect(report.issues[0].message).toContain('date');
    expect(report.reviewIds.has('bad-date')).toBe(true);
  });

  it('flags transactions with future dates as warnings', () => {
    const futureDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const txns = [makeTxn({ id: 'future', date: futureDate })];
    const report = validateImport(txns);
    expect(report.warningCount).toBe(1);
    expect(report.issues[0].message).toContain('future');
    expect(report.reviewIds.has('future')).toBe(true);
  });

  it('flags transactions with zero amount', () => {
    const txns = [makeTxn({ id: 'zero', amount: 0 })];
    const report = validateImport(txns);
    expect(report.errorCount).toBe(1);
    expect(report.issues[0].message).toContain('amount');
  });

  it('flags unusually large amounts as warnings', () => {
    const txns = [makeTxn({ id: 'big', amount: -20_000_000 })];
    const report = validateImport(txns);
    expect(report.warningCount).toBe(1);
    expect(report.issues[0].message).toContain('large');
  });

  it('flags short merchant names as warnings', () => {
    const txns = [makeTxn({ id: 'short-merchant', merchant: 'A' })];
    const report = validateImport(txns);
    expect(report.warningCount).toBe(1);
    expect(report.issues[0].message).toContain('Merchant');
  });

  it('marks low-confidence transactions for review', () => {
    const txns = [makeTxn({ id: 'low-conf', confidence: 0.4 })];
    const report = validateImport(txns);
    expect(report.reviewIds.has('low-conf')).toBe(true);
  });

  it('does not mark edited transactions for confidence-based review', () => {
    const txns = [makeTxn({ id: 'edited', confidence: 0.4, edited: true })];
    const report = validateImport(txns);
    expect(report.reviewIds.has('edited')).toBe(false);
  });

  it('computes confidence band correctly', () => {
    const highConf = [makeTxn({ confidence: 0.95 })];
    const reportHigh = validateImport(highConf);
    expect(reportHigh.confidence.band).toBe('high');

    const lowConf = [makeTxn({ confidence: 0.3, category: 'Uncategorized' })];
    const reportLow = validateImport(lowConf);
    expect(reportLow.confidence.band).toBe('low');
  });

  it('computes structural integrity factor', () => {
    const txns = [
      makeTxn({ id: 't1' }),
      makeTxn({ id: 't2', amount: 0 }), // will fail
    ];
    const report = validateImport(txns);
    expect(report.confidence.factors.structuralIntegrity).toBe(0.5);
  });

  it('computes recognition rate factor', () => {
    const txns = [
      makeTxn({ id: 't1', category: 'Food' }),
      makeTxn({ id: 't2', category: 'Uncategorized' }),
    ];
    const report = validateImport(txns);
    expect(report.confidence.factors.recognitionRate).toBe(0.5);
  });
});
