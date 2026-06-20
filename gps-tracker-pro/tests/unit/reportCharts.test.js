import { describe, it, expect } from 'vitest';
import {
  buildCountTrendData,
  buildDurationTrendData,
  getChartConfig,
  getVisiblePageNumbers,
  hasChartValues,
} from '../../src/pages/reports/reportCharts';
import { resolveStatusBadge } from '../../src/pages/reports/constants';

describe('reportCharts', () => {
  it('builds alert count trend by date', () => {
    const rows = [
      { date: '2026-06-01', vehicle: 'A' },
      { date: '2026-06-01', vehicle: 'B' },
      { date: '2026-06-02', vehicle: 'A' },
    ];
    expect(buildCountTrendData(rows)).toEqual([
      { date: '2026-06-01', count: 2 },
      { date: '2026-06-02', count: 1 },
    ]);
  });

  it('builds stop duration trend by date', () => {
    const rows = [
      { date: '2026-06-01', duration: 1.5 },
      { date: '2026-06-01', duration: 0.5 },
    ];
    expect(buildDurationTrendData(rows)).toEqual([
      { date: '2026-06-01', duration: 2 },
    ]);
  });

  it('returns chart config per report type', () => {
    expect(getChartConfig('alerts')?.trendKey).toBe('count');
    expect(getChartConfig('stops')?.trendKey).toBe('duration');
    expect(getChartConfig('trips')?.trendKey).toBe('distance');
  });

  it('limits visible pagination buttons', () => {
    const pages = getVisiblePageNumbers(10, 20, 7);
    expect(pages).toHaveLength(7);
    expect(pages[0]).toBe(7);
    expect(pages[6]).toBe(13);
  });

  it('detects chart values', () => {
    expect(hasChartValues([{ count: 0 }, { count: 2 }], 'count')).toBe(true);
    expect(hasChartValues([{ count: 0 }], 'count')).toBe(false);
  });
});

describe('resolveStatusBadge', () => {
  it('falls back to raw label for unknown status', () => {
    expect(resolveStatusBadge('custom')).toEqual({ variant: 'info', label: 'custom' });
  });
});
