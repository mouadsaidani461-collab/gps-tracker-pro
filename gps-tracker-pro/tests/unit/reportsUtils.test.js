import { describe, it, expect } from 'vitest';
import { formatDateStr, getPresetRange, isValidDateRange } from '../../src/pages/reports/utils';

describe('reports utils', () => {
  it('formats dates as ISO date keys', () => {
    expect(formatDateStr(new Date('2026-06-05T15:00:00.000Z'))).toBe('2026-06-05');
  });

  it('builds preset ranges from a reference date', () => {
    const ref = new Date('2026-06-07T12:00:00.000Z');
    expect(getPresetRange('today', ref)).toEqual({ from: '2026-06-07', to: '2026-06-07' });
    expect(getPresetRange('week', ref)).toEqual({ from: '2026-06-01', to: '2026-06-07' });
    expect(getPresetRange('month', ref)).toEqual({ from: '2026-05-09', to: '2026-06-07' });
  });

  it('validates date ranges', () => {
    expect(isValidDateRange('2026-06-01', '2026-06-07')).toBe(true);
    expect(isValidDateRange('2026-06-07', '2026-06-01')).toBe(false);
    expect(isValidDateRange('', '2026-06-01')).toBe(false);
  });
});
