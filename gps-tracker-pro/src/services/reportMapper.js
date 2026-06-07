import { EVENT_LABELS, deviceDisplayName } from '../utils/eventLabels';

const KNOTS_TO_KMH = 1.852;

function deviceLabel(devicesById, deviceId) {
  const device = devicesById[deviceId];
  return device?.plate || device?.name || deviceDisplayName(device);
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

export function mapTripsToRows(trips, devicesById) {
  return (trips ?? []).map((trip, index) => ({
    id: `trip-${trip.deviceId}-${trip.startTime}-${index}`,
    vehicleId: String(trip.deviceId),
    vehicle: deviceLabel(devicesById, trip.deviceId),
    driver: driverLabel(devicesById, trip.deviceId),
    type: 'رحلة',
    category: 'trips',
    date: toDateKey(trip.startTime),
    distance: (trip.distance || 0) / 1000,
    duration: hoursBetween(trip.startTime, trip.endTime),
    status: 'completed',
    speed: trip.maxSpeed ? Math.round(trip.maxSpeed * KNOTS_TO_KMH) : null,
  }));
}

export function mapSpeedRows(trips, devicesById, minKmh = 90) {
  return mapTripsToRows(trips, devicesById)
    .filter((row) => row.speed != null && row.speed >= minKmh)
    .map((row) => ({
      ...row,
      type: 'سرعة',
      category: 'speed',
      status: row.speed >= 120 ? 'alert' : 'warning',
    }));
}

export function mapEventsToRows(events, devicesById) {
  return (events ?? []).map((event, index) => ({
    id: `event-${event.id ?? index}-${event.eventTime}`,
    vehicleId: String(event.deviceId),
    vehicle: deviceLabel(devicesById, event.deviceId),
    driver: driverLabel(devicesById, event.deviceId),
    type: EVENT_LABELS[event.type] || event.type,
    category: 'alerts',
    date: toDateKey(event.eventTime),
    distance: 0,
    duration: 0,
    status: event.type === 'deviceOverspeed' || event.type === 'alarm' ? 'alert' : 'warning',
  }));
}

export function mapSummaryToRows(summaries, devicesById) {
  return (summaries ?? []).map((row, index) => ({
    id: `summary-${row.deviceId}-${index}`,
    vehicleId: String(row.deviceId),
    vehicle: deviceLabel(devicesById, row.deviceId),
    driver: driverLabel(devicesById, row.deviceId),
    type: 'ملخص',
    category: 'vehicles',
    date: toDateKey(row.startTime || row.endTime),
    distance: (row.distance || 0) / 1000,
    duration: (row.engineHours || 0) / 3600000,
    status: row.maxSpeed > 30 * KNOTS_TO_KMH ? 'warning' : 'completed',
    speed: row.maxSpeed ? Math.round(row.maxSpeed * KNOTS_TO_KMH) : null,
  }));
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
