/**
 * Routes Traccar WebSocket payloads → filtered notification entries.
 */

import { mapEventToNotification } from '../services/deviceMapper';
import { isEventNotificationEnabled } from './notificationPreferences';

/**
 * @param {{ events?: object[], devices?: object[] }} payload
 * @param {object} prefs
 * @param {string} language
 * @returns {object[]}
 */
export function processWebSocketEvents(payload, prefs, language) {
  if (!payload?.events?.length) return [];

  return payload.events
    .filter((event) => isEventNotificationEnabled(event, prefs))
    .map((event) => mapEventToNotification(event, payload.devices, language));
}
