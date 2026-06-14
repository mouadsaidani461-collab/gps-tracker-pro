/**
 * Traccar event type labels — locale-aware via i18n.
 */

import { translate } from '../i18n';
import { LOCALE } from './constants';

const EVENT_KEYS = [
  'deviceOverspeed',
  'geofenceEnter',
  'geofenceExit',
  'alarm',
  'deviceMoving',
  'deviceStopped',
  'deviceOffline',
  'deviceOnline',
  'maintenance',
  'deviceFuelDrop',
  'ignitionOn',
  'ignitionOff',
];

export function eventLabel(type, language = LOCALE.fallback) {
  if (type && EVENT_KEYS.includes(type)) {
    return translate(language, `events.${type}`);
  }
  return type ?? translate(language, 'events.unknown');
}

export function deviceDisplayName(device, language = LOCALE.fallback) {
  if (device?.name) return device.name;
  if (device?.uniqueId) return device.uniqueId;
  return translate(language, 'events.unknownVehicle');
}

/** @deprecated Use eventLabel(type, language) */
export const EVENT_LABELS = Object.fromEntries(
  EVENT_KEYS.map((key) => [key, translate(LOCALE.fallback, `events.${key}`)]),
);
