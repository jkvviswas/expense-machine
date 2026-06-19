import { describe, it, expect } from 'vitest';
import { categorize } from '../categorize';

describe('categorize', () => {
  it('categorizes Swiggy as Food', () => {
    const result = categorize('Swiggy', 'UPI/swiggy@axisbank/food order', -1);
    expect(result.category).toBe('Food');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('categorizes Zomato as Food', () => {
    const result = categorize('Zomato', 'UPI/zomato@hdfc/order', -1);
    expect(result.category).toBe('Food');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('categorizes Amazon as Shopping', () => {
    const result = categorize('Amazon', 'POS AMAZON INDIA', -1);
    expect(result.category).toBe('Shopping');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('categorizes Uber as Transport', () => {
    const result = categorize('Uber', 'UPI/uber@paytm/ride', -1);
    expect(result.category).toBe('Transport');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('categorizes Netflix as Entertainment', () => {
    const result = categorize('Netflix', 'AUTOPAY NETFLIX', -1);
    expect(result.category).toBe('Entertainment');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('categorizes salary as Income', () => {
    const result = categorize('ACME Corp', 'NEFT CR SALARY ACME CORP', 1);
    expect(result.category).toBe('Income');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('categorizes Zerodha as Investments', () => {
    const result = categorize('Zerodha', 'UPI/zerodha@hdfcbank/investment', -1);
    expect(result.category).toBe('Investments');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('categorizes electricity as Utilities', () => {
    const result = categorize('Tata Power', 'TATA POWER ELECTRICITY BILL', -1);
    expect(result.category).toBe('Utilities');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('categorizes LIC as Insurance', () => {
    const result = categorize('LIC India', 'LIC PREMIUM PAYMENT', -1);
    expect(result.category).toBe('Insurance');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('categorizes EMI as Bills', () => {
    const result = categorize('HDFC', 'AUTO DEBIT EMI HDFC LOAN', -1);
    expect(result.category).toBe('Bills');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('categorizes Udemy as Education', () => {
    const result = categorize('Udemy', 'UPI/UDEMY/course purchase', -1);
    expect(result.category).toBe('Education');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns Uncategorized with low confidence for unknown merchants', () => {
    const result = categorize('Random Shop', 'POS 1234 RANDOM SHOP', -1);
    expect(result.category).toBe('Uncategorized');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('defaults positive amount with no rule match to Income', () => {
    const result = categorize('Unknown Person', 'TRANSFER FROM UNKNOWN', 1);
    expect(result.category).toBe('Income');
    expect(result.confidence).toBe(0.55);
  });

  it('classifies refund text as Income (Income rule matches first)', () => {
    const result = categorize('Swiggy', 'SWIGGY REFUND', 1);
    // "refund" is an Income keyword, and it matches before Food
    expect(result.category).toBe('Income');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('categorizes Apollo as Healthcare', () => {
    const result = categorize('Apollo', 'POS APOLLO PHARMACY', -1);
    expect(result.category).toBe('Healthcare');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
