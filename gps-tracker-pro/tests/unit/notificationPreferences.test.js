import { describe, it, expect } from 'vitest';
import {
  isNotificationPrefWired,
  WIRED_NOTIFICATION_PREF_IDS,
  isEventNotificationEnabled,
} from '../../src/utils/notificationPreferences';

describe('notificationPreferences wired toggles', () => {
  it('marks Traccar-mapped pref keys as wired', () => {
    expect(isNotificationPrefWired('critical')).toBe(true);
    expect(isNotificationPrefWired('speed_limit_80')).toBe(true);
    expect(isNotificationPrefWired('geofence_enter_restricted')).toBe(true);
    expect(isNotificationPrefWired('offline_30m')).toBe(true);
    expect(isNotificationPrefWired('fuel_theft')).toBe(true);
    expect(isNotificationPrefWired('maintenance_oil')).toBe(true);
  });

  it('marks unmapped pref keys as not wired', () => {
    expect(isNotificationPrefWired('email')).toBe(false);
    expect(isNotificationPrefWired('weather_storm')).toBe(false);
    expect(isNotificationPrefWired('driver_hard_brake')).toBe(false);
    expect(isNotificationPrefWired('speed_limit_120')).toBe(false);
    expect(isNotificationPrefWired('offline_2h')).toBe(false);
  });

  it('exports a stable wired pref id set', () => {
    expect(WIRED_NOTIFICATION_PREF_IDS.size).toBe(7);
  });

  it('filters events using wired pref keys', () => {
    expect(isEventNotificationEnabled(
      { type: 'deviceOverspeed' },
      { speed_limit_80: false },
    )).toBe(false);
    expect(isEventNotificationEnabled(
      { type: 'deviceOverspeed' },
      { speed_limit_80: true, critical: true },
    )).toBe(true);
  });
});
