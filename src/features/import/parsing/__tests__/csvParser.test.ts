import { describe, it, expect } from 'vitest';
import { tokenizeCsv } from '../csvParser';

describe('tokenizeCsv', () => {
  it('parses simple comma-delimited rows', () => {
    const result = tokenizeCsv('a,b,c\n1,2,3\n', ',');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with commas inside', () => {
    const result = tokenizeCsv('"hello, world",b,c\n', ',');
    expect(result).toEqual([['hello, world', 'b', 'c']]);
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const result = tokenizeCsv('"say ""hi""",b\n', ',');
    expect(result).toEqual([['say "hi"', 'b']]);
  });

  it('handles CRLF line endings', () => {
    const result = tokenizeCsv('a,b\r\nc,d\r\n', ',');
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles standalone CR (old Mac line endings)', () => {
    const result = tokenizeCsv('a,b\rc,d\r', ',');
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('skips blank rows', () => {
    const result = tokenizeCsv('a,b\n\n\nc,d\n', ',');
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles semicolon delimiter', () => {
    const result = tokenizeCsv('a;b;c\n1;2;3\n', ';');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles tab delimiter', () => {
    const result = tokenizeCsv('a\tb\tc\n1\t2\t3\n', '\t');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('flushes trailing row without final newline', () => {
    const result = tokenizeCsv('a,b\nc,d', ',');
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles multiline quoted fields', () => {
    const result = tokenizeCsv('"line1\nline2",b\n', ',');
    expect(result).toEqual([['line1\nline2', 'b']]);
  });

  it('handles empty fields', () => {
    const result = tokenizeCsv('a,,c\n,b,\n', ',');
    expect(result).toEqual([
      ['a', '', 'c'],
      ['', 'b', ''],
    ]);
  });
});
