import { describe, it, expect } from 'vitest';
import { formatNumber, toWesternNumerals } from '../../src/utils/formatters';
import { hasPermission, resolveRoleFromTraccarUser, ROLES } from '../../src/utils/authRoles';
import { detectStops, calculateDistance } from '../../src/utils/tripUtils';
import { validateImei, validateMoroccoPhone, validatePassword, MIN_PASSWORD_LENGTH } from '../../src/utils/validation';
import { ensureReportArray, mapTripsToRows, mapStopsToRows, buildDevicesLookup } from '../../src/services/reportMapper';

describe('ensureReportArray', () => {
  it('returns empty array for non-array API payloads', () => {
    expect(ensureReportArray(null)).toEqual([]);
    expect(ensureReportArray({})).toEqual([]);
    expect(mapTripsToRows({}, {})).toEqual([]);
  });

  it('maps valid trip rows', () => {
    const lookup = buildDevicesLookup([{ id: '1', deviceId: 1, plate: 'TN-1', name: 'Car' }]);
    const rows = mapTripsToRows([{
      deviceId: 1,
      startTime: '2026-06-01T10:00:00Z',
      endTime: '2026-06-01T11:00:00Z',
      distance: 12000,
    }], lookup);
    expect(rows).toHaveLength(1);
    expect(rows[0].distance).toBeCloseTo(12);
  });

  it('maps stop rows with duration', () => {
    const lookup = buildDevicesLookup([{ id: '1', deviceId: 1, plate: 'TN-1', name: 'Car' }]);
    const rows = mapStopsToRows([{
      deviceId: 1,
      startTime: '2026-06-01T10:00:00Z',
      endTime: '2026-06-01T10:30:00Z',
      duration: 1800000,
      address: 'Casablanca',
    }], lookup, 'en');
    expect(rows).toHaveLength(1);
    expect(rows[0].vehicle).toBe('TN-1');
    expect(rows[0].duration).toBeCloseTo(0.5);
    expect(rows[0].address).toBe('Casablanca');
    expect(rows[0].category).toBe('stops');
  });
});

describe('formatNumber', () => {
  it('uses Western digits', () => {
    expect(formatNumber(1234)).toBe('1,234');
  });
});

describe('toWesternNumerals', () => {
  it('converts Arabic-Indic digits', () => {
    expect(toWesternNumerals('٠١٢٣')).toBe('0123');
  });
});

describe('resolveRoleFromTraccarUser', () => {
  it('maps administrator to admin', () => {
    expect(resolveRoleFromTraccarUser({ administrator: true, readonly: false })).toBe(ROLES.ADMIN);
  });
  it('maps readonly to viewer', () => {
    expect(resolveRoleFromTraccarUser({ administrator: false, readonly: true })).toBe(ROLES.VIEWER);
  });
  it('maps normal user to operator', () => {
    expect(resolveRoleFromTraccarUser({ administrator: false, readonly: false })).toBe(ROLES.OPERATOR);
  });
  it('prefers administrator over readonly', () => {
    expect(resolveRoleFromTraccarUser({ administrator: true, readonly: true })).toBe(ROLES.ADMIN);
  });
});

describe('hasPermission', () => {
  it('grants admin wildcard', () => {
    expect(hasPermission(ROLES.ADMIN, 'devices:write')).toBe(true);
  });
  it('denies viewer write', () => {
    expect(hasPermission(ROLES.VIEWER, 'vehicles:write')).toBe(false);
  });
});

describe('detectStops', () => {
  it('detects stop over 5 minutes below 5 km/h', () => {
    const positions = [];
    const base = new Date('2026-06-01T10:00:00Z');
    for (let i = 0; i < 7; i += 1) {
      positions.push({
        latitude: 33.5,
        longitude: -7.6,
        speedKmh: 0,
        fixTime: new Date(base.getTime() + i * 60000).toISOString(),
      });
    }
    positions.push({
      latitude: 33.51,
      longitude: -7.6,
      speedKmh: 40,
      fixTime: new Date(base.getTime() + 7 * 60000).toISOString(),
    });
    const stops = detectStops(positions);
    expect(stops.length).toBe(1);
  });
});

describe('calculateDistance', () => {
  it('returns km between two points', () => {
    const d = calculateDistance(33.5731, -7.5898, 34.0209, -6.8416);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(120);
  });
});

describe('validation', () => {
  it('accepts 15-digit IMEI', () => {
    expect(validateImei('123456789012345')).toBeNull();
  });
  it('rejects invalid Morocco phone (locale-aware)', () => {
    expect(validateMoroccoPhone('0612345678', { language: 'en' })).toMatch(/invalid/i);
    expect(validateMoroccoPhone('0612345678', { language: 'ar' })).toMatch(/غير صالح/);
  });
  it('enforces shared minimum password length', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validatePassword('short', { language: 'en' })).toMatch(/8/);
    expect(validatePassword('longenough', { language: 'en' })).toBeNull();
  });
});
