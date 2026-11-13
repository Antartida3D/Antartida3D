import { describe, expect, it } from 'vitest';
import { formatIsoDate } from '../src/index.ts';

describe('formatIsoDate', () => {
  it('writes an ISO date as DD/MM/YYYY', () => {
    expect(formatIsoDate('2026-11-12')).toBe('12/11/2026');
    expect(formatIsoDate('2026-01-05')).toBe('05/01/2026');
  });

  it('leaves anything that is not an ISO date as it is', () => {
    expect(formatIsoDate('12/11/2026')).toBe('12/11/2026');
    expect(formatIsoDate('2026-11')).toBe('2026-11');
    expect(formatIsoDate('')).toBe('');
  });
});
