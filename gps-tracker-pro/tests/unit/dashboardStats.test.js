import { describe, it, expect, vi } from 'vitest';
import { buildDashboardStatCards } from '../../src/pages/dashboard/stats';

const t = vi.fn((key) => key);
const formatNumber = (value) => String(value);

const baseArgs = {
  t,
  formatNumber,
  stats: {
    total: 10,
    moving: 3,
    alert: 1,
    activeAlerts: 2,
  },
  activeNow: 7,
  isConnected: true,
  userCount: 5,
  usersLoading: false,
  geofencesCount: 4,
  notAvailable: '—',
  loading: false,
};

describe('buildDashboardStatCards', () => {
  it('returns four cards for admin with user stats', () => {
    const cards = buildDashboardStatCards({ ...baseArgs, isAdmin: true });
    expect(cards).toHaveLength(4);
    expect(cards[3].id).toBe('users');
    expect(cards[3].value).toBe('5');
  });

  it('returns geofence card for non-admin', () => {
    const cards = buildDashboardStatCards({ ...baseArgs, isAdmin: false });
    expect(cards[3].id).toBe('geofences');
    expect(cards[3].value).toBe('4');
  });

  it('uses notAvailable while fleet is loading', () => {
    const cards = buildDashboardStatCards({ ...baseArgs, isAdmin: false, loading: true });
    expect(cards[0].value).toBe('—');
    expect(cards[1].trend.text).toBe('—');
  });
});
