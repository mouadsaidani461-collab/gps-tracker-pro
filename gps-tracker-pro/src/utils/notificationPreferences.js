/**
 * Notification preferences from Settings → localStorage (capture_settings).
 * Filters Traccar WebSocket events before they appear in the bell panel.
 */

import {
  CRITICAL_GATED_EVENT_TYPES,
  resolveEventPrefKeys,
  WIRED_NOTIFICATION_PREF_IDS,
} from './traccarEventMapping';

export { WIRED_NOTIFICATION_PREF_IDS } from './traccarEventMapping';

const SETTINGS_KEY = 'capture_settings';

export function isNotificationPrefWired(prefId) {
  return WIRED_NOTIFICATION_PREF_IDS.has(prefId);
}

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
 * Per-device filter stored in notifications prefs.
 * deviceFilterMode: 'all' | 'allowlist' | 'blocklist'
 * deviceFilterIds: number[] | string[]
 */
export function isDeviceNotificationEnabled(deviceId, prefs = loadNotificationPreferences()) {
  if (deviceId == null || deviceId === '') return true;

  const id = String(deviceId);
  const mode = prefs.deviceFilterMode ?? 'all';
  const ids = (prefs.deviceFilterIds ?? []).map(String);

  if (mode === 'allowlist') {
    return ids.length === 0 || ids.includes(id);
  }
  if (mode === 'blocklist') {
    return !ids.includes(id);
  }
  return true;
}

/**
 * Returns true when the event should appear in the notification panel.
 * Mapped events: shown if ANY resolved pref key is enabled.
 * Unmapped events: shown by default (backward compatible).
 */
export function isEventNotificationEnabled(event, prefs = loadNotificationPreferences()) {
  if (!event?.type) return true;

  if (!isDeviceNotificationEnabled(event.deviceId, prefs)) return false;

  const prefKeys = resolveEventPrefKeys(event);

  if (prefKeys.length === 0) return true;

  if (CRITICAL_GATED_EVENT_TYPES.has(event.type) && prefs.critical === false) {
    return false;
  }

  return prefKeys.some((key) => prefs[key] !== false);
}

export function dispatchNotificationPreferencesUpdated() {
  window.dispatchEvent(new CustomEvent('capture:notification-prefs'));
}
