import { translate } from '../i18n';
import { LOCALE } from '../utils/constants';
import { eventLabel, deviceDisplayName } from '../utils/eventLabels';

const KNOTS_TO_KMH = 1.852;

/** Traccar report endpoints must return arrays — guard against unexpected payloads. */
export function ensureReportArray(value) {
  return Array.isArray(value) ? value : [];
}

function deviceLabel(devicesById, deviceId, language) {
  const device = devicesById[deviceId];
  return device?.plate || device?.name || deviceDisplayName(device, language);
}

function driverLabel(devicesById, deviceId) {
  return devicesById[deviceId]?.driver || '—';
}

function toDateKey(iso) {
  if (!iso) return '';
  return iso.split('T')[0];
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  return (new Date(end) - new Date(start)) / 3600000;
}

function rowType(language, key) {
  return translate(language, `reports.rowTypes.${key}`);
}

export function mapTripsToRows(trips, devicesById, language = LOCALE.fallback) {
  return ensureReportArray(trips).map((trip, index) => ({
    id: `trip-${trip.deviceId}-${trip.startTime}-${index}`,
    vehicleId: String(trip.deviceId),
    vehicle: deviceLabel(devicesById, trip.deviceId, language),
    driver: driverLabel(devicesById, trip.deviceId),
    type: rowType(language, 'trip'),
    category: 'trips',
    date: toDateKey(trip.startTime),
    distance: (trip.distance || 0) / 1000,
    duration: hoursBetween(trip.startTime, trip.endTime),
    status: 'completed',
    speed: trip.maxSpeed ? Math.round(trip.maxSpeed * KNOTS_TO_KMH) : null,
  }));
}

export function mapSpeedRows(trips, devicesById, minKmh = 90, language = LOCALE.fallback) {
  return mapTripsToRows(trips, devicesById, language)
    .filter((row) => row.speed != null && row.speed >= minKmh)
    .map((row) => ({
      ...row,
      type: rowType(language, 'speed'),
      category: 'speed',
      status: row.speed >= 120 ? 'alert' : 'warning',
    }));
}

export function mapEventsToRows(events, devicesById, language = LOCALE.fallback) {
  return ensureReportArray(events).map((event, index) => ({
    id: `event-${event.id ?? index}-${event.eventTime}`,
    vehicleId: String(event.deviceId),
    vehicle: deviceLabel(devicesById, event.deviceId, language),
    driver: driverLabel(devicesById, event.deviceId),
    type: eventLabel(event.type, language),
    category: 'alerts',
    date: toDateKey(event.eventTime),
    distance: 0,
    duration: 0,
    status: event.type === 'deviceOverspeed' || event.type === 'alarm' ? 'alert' : 'warning',
  }));
}

export function mapSummaryToRows(summaries, devicesById, language = LOCALE.fallback) {
  return ensureReportArray(summaries).map((row, index) => ({
    id: `summary-${row.deviceId}-${index}`,
    vehicleId: String(row.deviceId),
    vehicle: deviceLabel(devicesById, row.deviceId, language),
    driver: driverLabel(devicesById, row.deviceId),
    type: rowType(language, 'summary'),
    category: 'vehicles',
    date: toDateKey(row.startTime || row.endTime),
    distance: (row.distance || 0) / 1000,
    duration: (row.engineHours || 0) / 3600000,
    status: row.maxSpeed > 30 * KNOTS_TO_KMH ? 'warning' : 'completed',
    speed: row.maxSpeed ? Math.round(row.maxSpeed * KNOTS_TO_KMH) : null,
  }));
}

export function mapStopsToRows(stops, devicesById, language = LOCALE.fallback) {
  return ensureReportArray(stops).map((stop, index) => {
    const durationMs = stop.duration ?? (
      stop.startTime && stop.endTime
        ? new Date(stop.endTime) - new Date(stop.startTime)
        : 0
    );
    return {
      id: `stop-${stop.deviceId}-${stop.startTime}-${index}`,
      vehicleId: String(stop.deviceId),
      vehicle: deviceLabel(devicesById, stop.deviceId, language),
      driver: driverLabel(devicesById, stop.deviceId),
      type: stop.address || rowType(language, 'stop'),
      category: 'stops',
      date: toDateKey(stop.startTime),
      distance: 0,
      duration: durationMs / 3600000,
      status: 'completed',
      startTime: stop.startTime,
      endTime: stop.endTime,
      address: stop.address ?? '',
    };
  });
}

export function buildDevicesLookup(vehicles) {
  const map = {};
  (vehicles ?? []).forEach((v) => {
    map[v.deviceId ?? Number(v.id)] = v;
    map[Number(v.id)] = v;
  });
  return map;
}

export function toIsoRange(dateFrom, dateTo) {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T23:59:59`);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
