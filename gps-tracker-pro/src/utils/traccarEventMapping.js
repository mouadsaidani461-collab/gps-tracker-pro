/**
 * Maps Traccar WebSocket/report events → Settings notification pref keys.
 * @see https://www.traccar.org/api-reference/
 */

const KNOTS_TO_KMH = 1.852;
const NIGHT_START = 22;
const NIGHT_END = 6;

/** Speed tier pref keys (km/h) — aligned with Settings labels */
export const SPEED_TIER_PREFS = {
  80: 'speed_limit_80',
  120: 'speed_limit_120',
  150: 'speed_dangerous_150',
};

/** Traccar alarm attribute → notification pref keys */
export const ALARM_PREF_MAP = {
  general: ['critical'],
  sos: ['critical'],
  vibration: ['critical'],
  movement: ['critical'],
  overspeed: [], // resolved via speed tier
  fallDown: ['critical'],
  lowPower: ['battery_critical', 'battery_not_charging'],
  lowBattery: ['battery_low'],
  fault: ['critical'],
  powerOff: ['battery_not_charging', 'battery_critical'],
  powerOn: ['critical'],
  powerCut: ['battery_not_charging', 'battery_critical'],
  door: ['critical'],
  lock: ['critical'],
  unlock: ['critical'],
  geofence: ['geofence_enter_restricted'],
  geofenceEnter: ['geofence_enter_restricted'],
  geofenceExit: ['geofence_exit_allowed'],
  gpsAntennaCut: ['critical'],
  accident: ['critical'],
  tow: ['critical'],
  idle: ['critical'],
  highRpm: ['critical'],
  hardAcceleration: ['driver_rapid_accel'],
  hardBraking: ['driver_hard_brake'],
  hardCornering: ['driver_sharp_turn'],
  laneChange: ['driver_sharp_turn'],
  fatigueDriving: ['driver_night_driving'],
  jamming: ['critical'],
  temperature: ['weather_extreme_heat'],
  parking: ['critical'],
  fuelLeak: ['fuel_theft', 'fuel_low'],
  tampering: ['critical'],
  removing: ['critical'],
  footBrake: ['driver_hard_brake'],
};

/** Direct Traccar event.type → pref keys (may be augmented by attributes) */
export const EVENT_TYPE_PREF_MAP = {
  deviceOverspeed: [], // speed tier
  geofenceEnter: ['geofence_enter_restricted'],
  geofenceExit: ['geofence_exit_allowed'],
  deviceOffline: ['offline_30m', 'offline_2h', 'offline_24h'],
  deviceInactive: ['offline_30m'],
  deviceFuelDrop: ['fuel_theft', 'fuel_abnormal'],
  deviceFuelIncrease: ['fuel_abnormal', 'fuel_low'],
  maintenance: ['maintenance_oil', 'maintenance_brakes', 'maintenance_inspection', 'maintenance_insurance'],
  ignitionOn: [],
  ignitionOff: [],
  deviceMoving: [],
  deviceStopped: [],
  deviceOnline: [],
  deviceUnknown: [],
  textMessage: [],
  driverChanged: [],
  media: [],
  alarm: [], // alarm subtype
};

/** Traccar types that require the global "critical" toggle (backward compatible). */
export const CRITICAL_GATED_EVENT_TYPES = new Set(['alarm', 'deviceOverspeed']);

/** All notification pref ids driven by Traccar events (excludes email). */
export const WIRED_NOTIFICATION_PREF_IDS = new Set([
  'critical',
  'battery_low',
  'battery_critical',
  'battery_not_charging',
  'offline_30m',
  'offline_2h',
  'offline_24h',
  'speed_limit_80',
  'speed_limit_120',
  'speed_dangerous_150',
  'geofence_enter_restricted',
  'geofence_exit_allowed',
  'geofence_enter_after_22',
  'maintenance_oil',
  'maintenance_brakes',
  'maintenance_inspection',
  'maintenance_insurance',
  'driver_hard_brake',
  'driver_rapid_accel',
  'driver_sharp_turn',
  'driver_night_driving',
  'weather_storm',
  'weather_heavy_rain',
  'weather_fog',
  'weather_extreme_heat',
  'fuel_low',
  'fuel_abnormal',
  'fuel_theft',
]);

export function eventSpeedKmh(event) {
  const raw = event?.attributes?.speed ?? event?.attributes?.speedLimit;
  if (raw == null || raw === '') return null;
  const knots = Number(raw);
  if (Number.isNaN(knots)) return null;
  return Math.round(knots * KNOTS_TO_KMH);
}

export function speedPrefKey(speedKmh) {
  if (speedKmh == null || Number.isNaN(speedKmh)) return SPEED_TIER_PREFS[80];
  if (speedKmh >= 150) return SPEED_TIER_PREFS[150];
  if (speedKmh >= 120) return SPEED_TIER_PREFS[120];
  return SPEED_TIER_PREFS[80];
}

function eventDate(event) {
  const raw = event?.eventTime ?? event?.serverTime;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isNightEvent(event) {
  const date = eventDate(event);
  if (!date) return false;
  const hour = date.getHours();
  return hour >= NIGHT_START || hour < NIGHT_END;
}

function resolveAlarmPrefKeys(alarmType, speedKmh) {
  if (!alarmType) return ['critical'];
  const mapped = ALARM_PREF_MAP[alarmType];
  if (!mapped) return ['critical'];

  const keys = [...mapped];
  if (alarmType === 'overspeed' || alarmType === 'alarmOverspeed') {
    keys.push(speedPrefKey(speedKmh));
  }
  if (keys.length === 0) keys.push('critical');
  return keys;
}

/**
 * Returns notification pref keys for a Traccar event (deduped).
 * Empty array = no mapped prefs → caller shows event by default.
 */
export function resolveEventPrefKeys(event) {
  if (!event?.type) return [];

  const speedKmh = eventSpeedKmh(event);
  const keys = [];

  switch (event.type) {
    case 'deviceOverspeed':
      keys.push(speedPrefKey(speedKmh));
      break;
    case 'geofenceEnter':
      keys.push('geofence_enter_restricted');
      if (isNightEvent(event)) keys.push('geofence_enter_after_22');
      break;
    case 'geofenceExit':
      keys.push('geofence_exit_allowed');
      break;
    case 'deviceOffline':
      keys.push('offline_30m', 'offline_2h', 'offline_24h');
      break;
    case 'deviceInactive':
      keys.push('offline_30m');
      break;
    case 'deviceFuelDrop':
      keys.push('fuel_theft', 'fuel_abnormal');
      break;
    case 'deviceFuelIncrease':
      keys.push('fuel_abnormal');
      break;
    case 'maintenance':
      keys.push(
        'maintenance_oil',
        'maintenance_brakes',
        'maintenance_inspection',
        'maintenance_insurance',
      );
      break;
    case 'alarm': {
      const alarmType = event.attributes?.alarm;
      keys.push(...resolveAlarmPrefKeys(alarmType, speedKmh));
      break;
    }
    case 'ignitionOn':
    case 'deviceMoving':
      if (isNightEvent(event)) keys.push('driver_night_driving');
      break;
    default:
      keys.push(...(EVENT_TYPE_PREF_MAP[event.type] ?? []));
      break;
  }

  return [...new Set(keys.filter(Boolean))];
}

const WARNING_PREF_KEYS = new Set([
  'speed_limit_80',
  'offline_30m',
  'geofence_exit_allowed',
  'fuel_abnormal',
  'driver_sharp_turn',
  'maintenance_brakes',
  'maintenance_inspection',
]);

const CRITICAL_PREF_KEYS = new Set([
  'critical',
  'speed_dangerous_150',
  'speed_limit_120',
  'fuel_theft',
  'battery_critical',
  'geofence_enter_restricted',
  'driver_hard_brake',
  'offline_24h',
]);

/** Map Traccar event → UI notification severity (critical / warning / info / success). */
export function resolveNotificationTypeFromEvent(event) {
  if (!event?.type) return 'info';

  if (event.type === 'deviceOnline' || event.type === 'textMessage') return 'success';

  const prefKeys = resolveEventPrefKeys(event);
  if (prefKeys.some((key) => CRITICAL_PREF_KEYS.has(key))) return 'critical';
  if (prefKeys.some((key) => WARNING_PREF_KEYS.has(key))) return 'warning';

  if (event.type === 'alarm' || event.type === 'deviceOverspeed') return 'critical';
  if (event.type === 'deviceOffline' || event.type === 'geofenceExit') return 'warning';

  return 'info';
}

/** Legacy single-key map (first key per type) — used by tests / backward compat. */
export const LEGACY_EVENT_PREF_KEYS = {
  deviceOverspeed: 'speed_limit_80',
  geofenceEnter: 'geofence_enter_restricted',
  geofenceExit: 'geofence_exit_allowed',
  deviceOffline: 'offline_30m',
  deviceFuelDrop: 'fuel_theft',
  maintenance: 'maintenance_oil',
  alarm: 'critical',
};
