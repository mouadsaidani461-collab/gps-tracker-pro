/**
 * Traccar event type labels — locale-aware via i18n.
 */

import { translate } from '../i18n';
import { LOCALE } from './constants';

export const TRACCAR_EVENT_TYPES = [
  'deviceOverspeed',
  'geofenceEnter',
  'geofenceExit',
  'alarm',
  'deviceMoving',
  'deviceStopped',
  'deviceOffline',
  'deviceOnline',
  'deviceUnknown',
  'deviceInactive',
  'maintenance',
  'deviceFuelDrop',
  'deviceFuelIncrease',
  'ignitionOn',
  'ignitionOff',
  'textMessage',
  'driverChanged',
  'media',
];

export const TRACCAR_ALARM_TYPES = [
  'general',
  'sos',
  'vibration',
  'movement',
  'overspeed',
  'fallDown',
  'lowPower',
  'lowBattery',
  'fault',
  'powerOff',
  'powerOn',
  'powerCut',
  'door',
  'lock',
  'unlock',
  'geofence',
  'geofenceEnter',
  'geofenceExit',
  'gpsAntennaCut',
  'accident',
  'tow',
  'idle',
  'highRpm',
  'hardAcceleration',
  'hardBraking',
  'hardCornering',
  'laneChange',
  'fatigueDriving',
  'jamming',
  'temperature',
  'parking',
  'fuelLeak',
  'tampering',
  'removing',
  'footBrake',
];

const EVENT_KEYS = TRACCAR_EVENT_TYPES;

export function eventLabel(type, language = LOCALE.fallback) {
  if (typeof type === 'string' && type.startsWith('alarm.')) {
    const subtype = type.slice(6);
    const alarmKey = `events.alarms.${subtype}`;
    const alarmLabel = translate(language, alarmKey);
    if (alarmLabel !== alarmKey) return alarmLabel;
    return translate(language, 'events.alarm');
  }

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
