/**
 * Notification preferences from Settings → localStorage (capture_settings).
 * Filters Traccar WebSocket events before they appear in the bell panel.
 */

const SETTINGS_KEY = 'capture_settings';

/** Traccar event.type → settings.notifications key */
const EVENT_PREF_KEYS = {
  deviceOverspeed: 'speed_limit_80',
  geofenceEnter: 'geofence_enter_restricted',
  geofenceExit: 'geofence_exit_allowed',
  deviceOffline: 'offline_30m',
  deviceFuelDrop: 'fuel_theft',
  maintenance: 'maintenance_oil',
  alarm: 'critical',
};

/** Pref keys that actually filter Traccar WebSocket events (hide dead toggles in Settings). */
export const WIRED_NOTIFICATION_PREF_IDS = new Set([
  'critical',
  ...Object.values(EVENT_PREF_KEYS),
]);

export function isNotificationPrefWired(prefId) {
  return WIRED_NOTIFICATION_PREF_IDS.has(prefId);
}

const ALERT_EVENT_TYPES = new Set(['alarm', 'deviceOverspeed']);

export function loadNotificationPreferences() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed.notifications ?? {};
  } catch {
    return {};
  }
}

/**
 * Returns true when the event should appear in the notification panel.
 * Unmapped event types are shown by default (backward compatible).
 */
export function isEventNotificationEnabled(event, prefs = loadNotificationPreferences()) {
  if (!event?.type) return true;

  const prefKey = EVENT_PREF_KEYS[event.type];
  if (prefKey && prefs[prefKey] === false) return false;

  if (ALERT_EVENT_TYPES.has(event.type) && prefs.critical === false) return false;

  return true;
}

export function dispatchNotificationPreferencesUpdated() {
  window.dispatchEvent(new CustomEvent('capture:notification-prefs'));
}
