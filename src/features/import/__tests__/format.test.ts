import { describe, it, expect } from 'vitest';
import { formatMoney, formatMoneyFull, confidenceBand } from '../format';

describe('formatMoney', () => {
  it('formats positive whole number', () => {
    const result = formatMoney(1250);
    expect(result.whole).toBe('1,250');
    expect(result.paise).toBeNull();
    expect(result.sign).toBe('');
  });

  it('formats negative amount with sign', () => {
    const result = formatMoney(-500);
    expect(result.sign).toBe('\u2212'); // minus sign (−)
    expect(result.whole).toBe('500');
    expect(result.paise).toBeNull();
  });

  it('includes paise when non-zero', () => {
    const result = formatMoney(1234.56);
    // whole = Math.trunc(1234.56) = 1234
    expect(result.whole).toBe('1,234');
    // paise = Math.round((1234.56 - 1234) * 100) = 56
    expect(result.paise).toBe('56');
  });

  it('handles zero', () => {
    const result = formatMoney(0);
    expect(result.sign).toBe('');
    expect(result.whole).toBe('0');
    expect(result.paise).toBeNull();
  });

  it('formats large Indian number (lakh)', () => {
    const result = formatMoney(125000);
    expect(result.whole).toBe('1,25,000');
  });
});

describe('formatMoneyFull', () => {
  it('formats positive whole amount', () => {
    expect(formatMoneyFull(1000)).toMatch(/₹1,000$/);
  });

  it('formats negative amount with minus sign', () => {
    const result = formatMoneyFull(-500);
    expect(result).toContain('\u2212');
    expect(result).toContain('₹');
    expect(result).toContain('500');
  });

  it('includes decimal when paise present', () => {
    const result = formatMoneyFull(84250.5);
    expect(result).toContain('.50');
  });

  it('omits decimals for whole amounts', () => {
    const result = formatMoneyFull(1000);
    expect(result).not.toContain('.');
  });
});

describe('confidenceBand', () => {
  it('returns High for confidence >= 0.9', () => {
    const result = confidenceBand(0.95);
    expect(result.label).toBe('High');
    expect(result.tone).toBe('var(--em-gain)');
  });

  it('returns Likely for confidence >= 0.7', () => {
    const result = confidenceBand(0.75);
    expect(result.label).toBe('Likely');
    expect(result.tone).toBe('var(--em-brass)');
  });

  it('returns Review for confidence < 0.7', () => {
    const result = confidenceBand(0.4);
    expect(result.label).toBe('Review');
    expect(result.tone).toBe('var(--em-loss)');
  });

  it('returns High at exactly 0.9', () => {
    expect(confidenceBand(0.9).label).toBe('High');
  });

  it('returns Likely at exactly 0.7', () => {
    expect(confidenceBand(0.7).label).toBe('Likely');
  });
});
