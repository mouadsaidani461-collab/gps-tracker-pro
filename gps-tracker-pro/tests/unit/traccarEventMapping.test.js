import { describe, it, expect } from 'vitest';
import {
  resolveEventPrefKeys,
  eventSpeedKmh,
  speedPrefKey,
  resolveNotificationTypeFromEvent,
  WIRED_NOTIFICATION_PREF_IDS,
  isNightEvent,
} from '../../src/utils/traccarEventMapping';
import {
  isNotificationPrefWired,
  isEventNotificationEnabled,
  isDeviceNotificationEnabled,
} from '../../src/utils/notificationPreferences';
import { processWebSocketEvents } from '../../src/utils/notificationEventRouter';

describe('traccarEventMapping', () => {
  it('maps deviceOverspeed to speed tier by km/h', () => {
    expect(speedPrefKey(75)).toBe('speed_limit_80');
    expect(speedPrefKey(95)).toBe('speed_limit_80');
    expect(speedPrefKey(125)).toBe('speed_limit_120');
    expect(speedPrefKey(160)).toBe('speed_dangerous_150');
    expect(speedPrefKey(null)).toBe('speed_limit_80');
  });

  it('converts knots in event attributes to km/h', () => {
    expect(eventSpeedKmh({ attributes: { speed: 50 } })).toBe(93);
  });

  it('maps alarm subtypes to driver and battery prefs', () => {
    expect(resolveEventPrefKeys({ type: 'alarm', attributes: { alarm: 'hardBraking' } }))
      .toContain('driver_hard_brake');
    expect(resolveEventPrefKeys({ type: 'alarm', attributes: { alarm: 'lowBattery' } }))
      .toContain('battery_low');
  });

  it('maps geofence enter at night to after-22 pref', () => {
    const keys = resolveEventPrefKeys({
      type: 'geofenceEnter',
      eventTime: '2026-06-05T23:00:00.000Z',
    });
    expect(keys).toContain('geofence_enter_restricted');
    expect(keys).toContain('geofence_enter_after_22');
  });

  it('detects night events', () => {
    expect(isNightEvent({ eventTime: '2026-06-05T23:30:00.000Z' })).toBe(true);
    expect(isNightEvent({ eventTime: '2026-06-05T14:00:00.000Z' })).toBe(false);
  });

  it('maps deviceOffline to all offline pref tiers', () => {
    const keys = resolveEventPrefKeys({ type: 'deviceOffline' });
    expect(keys).toEqual(expect.arrayContaining(['offline_30m', 'offline_2h', 'offline_24h']));
  });

  it('resolves notification severity from event', () => {
    expect(resolveNotificationTypeFromEvent({ type: 'deviceOnline' })).toBe('success');
    expect(resolveNotificationTypeFromEvent({
      type: 'alarm',
      attributes: { alarm: 'hardBraking' },
    })).toBe('critical');
  });
});

describe('notificationPreferences wired toggles', () => {
  it('marks Traccar-mapped pref keys as wired', () => {
    expect(isNotificationPrefWired('critical')).toBe(true);
    expect(isNotificationPrefWired('speed_limit_80')).toBe(true);
    expect(isNotificationPrefWired('driver_hard_brake')).toBe(true);
    expect(isNotificationPrefWired('weather_extreme_heat')).toBe(true);
  });

  it('marks email as not wired', () => {
    expect(isNotificationPrefWired('email')).toBe(false);
  });

  it('exports expanded wired pref id set', () => {
    expect(WIRED_NOTIFICATION_PREF_IDS.size).toBeGreaterThanOrEqual(28);
  });

  it('filters events using wired pref keys (backward compatible overspeed + critical)', () => {
    expect(isEventNotificationEnabled(
      { type: 'deviceOverspeed', attributes: { speed: 45 } },
      { speed_limit_80: false, critical: true },
    )).toBe(false);

    expect(isEventNotificationEnabled(
      { type: 'deviceOverspeed', attributes: { speed: 45 } },
      { speed_limit_80: true, critical: false },
    )).toBe(false);

    expect(isEventNotificationEnabled(
      { type: 'deviceOverspeed', attributes: { speed: 45 } },
      { speed_limit_80: true, critical: true },
    )).toBe(true);
  });

  it('uses OR logic for multi-key offline prefs', () => {
    expect(isEventNotificationEnabled(
      { type: 'deviceOffline', deviceId: 1 },
      { offline_30m: false, offline_2h: true, offline_24h: false, critical: true },
    )).toBe(true);

    expect(isEventNotificationEnabled(
      { type: 'deviceOffline', deviceId: 1 },
      { offline_30m: false, offline_2h: false, offline_24h: false, critical: true },
    )).toBe(false);
  });

  it('filters by device allowlist and blocklist', () => {
    const prefsAllow = { deviceFilterMode: 'allowlist', deviceFilterIds: ['7'] };
    expect(isDeviceNotificationEnabled(7, prefsAllow)).toBe(true);
    expect(isDeviceNotificationEnabled(8, prefsAllow)).toBe(false);

    const prefsBlock = { deviceFilterMode: 'blocklist', deviceFilterIds: ['7'] };
    expect(isDeviceNotificationEnabled(7, prefsBlock)).toBe(false);
    expect(isDeviceNotificationEnabled(8, prefsBlock)).toBe(true);
  });

  it('shows unmapped events by default', () => {
    expect(isEventNotificationEnabled({ type: 'textMessage', deviceId: 1 }, {})).toBe(true);
  });
});

describe('notificationEventRouter', () => {
  it('maps and filters websocket payload', () => {
    const payload = {
      devices: [{ id: 1, name: 'Truck A' }],
      events: [
        { id: 10, type: 'deviceOverspeed', deviceId: 1, attributes: { speed: 50 } },
        { id: 11, type: 'deviceOffline', deviceId: 1 },
      ],
    };
    const prefs = {
      critical: true,
      speed_limit_80: true,
      offline_30m: false,
      offline_2h: false,
      offline_24h: false,
    };

    const result = processWebSocketEvents(payload, prefs, 'en');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('10');
    expect(result[0].title).toContain('Truck A');
  });
});
