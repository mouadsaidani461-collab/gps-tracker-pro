import { describe, it, expect } from 'vitest';
import { getLatestFleetTimestamp } from '../../src/pages/map/utils';

describe('getLatestFleetTimestamp', () => {
  it('returns latest valid timestamp', () => {
    const ts = getLatestFleetTimestamp([
      { lastUpdate: '2026-01-01T10:00:00.000Z' },
      { lastUpdate: '2026-01-02T10:00:00.000Z' },
      { lastUpdate: 'invalid' },
    ]);
    expect(ts).toBe(new Date('2026-01-02T10:00:00.000Z').getTime());
  });

  it('returns 0 when no valid timestamps', () => {
    expect(getLatestFleetTimestamp([{ lastUpdate: 'bad' }])).toBe(0);
    expect(getLatestFleetTimestamp([])).toBe(0);
  });
});
