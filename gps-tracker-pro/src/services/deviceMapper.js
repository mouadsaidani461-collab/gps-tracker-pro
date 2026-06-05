import { MAP, VEHICLE_STATUS } from '../utils/constants';

const KNOTS_TO_KMH = 1.852;

function mapDeviceStatus(device, position) {
  if (device.status === 'offline') return VEHICLE_STATUS.OFFLINE;
  if (!position) return VEHICLE_STATUS.ONLINE;
  const speedKmh = (position.speed || 0) * KNOTS_TO_KMH;
  if (speedKmh > 5) return VEHICLE_STATUS.MOVING;
  if (speedKmh > 0) return VEHICLE_STATUS.IDLE;
  return VEHICLE_STATUS.ONLINE;
}

export function mapDeviceToVehicle(device, position) {
  const status = mapDeviceStatus(device, position);
  const speed = position ? Math.round((position.speed || 0) * KNOTS_TO_KMH) : 0;
  const hasPosition = Boolean(position?.latitude && position?.longitude);

  return {
    id: String(device.id),
    deviceId: device.id,
    name: device.name || device.uniqueId,
    plate: device.attributes?.plate || device.uniqueId,
    type: device.category || 'car',
    driver: device.contact || '—',
    driverPhone: device.phone || '',
    status,
    speed,
    hasPosition,
    location: {
      lat: position?.latitude ?? MAP.center[0],
      lng: position?.longitude ?? MAP.center[1],
      address: position?.address || '—',
    },
    battery: position?.attributes?.batteryLevel ?? 100,
    signal: device.status === 'online' ? 85 : 0,
    fuel: position?.attributes?.fuel ?? 0,
    odometer: position?.attributes?.odometer ?? device.attributes?.totalDistance ?? 0,
    lastUpdate: position?.deviceTime || device.lastUpdate || new Date().toISOString(),
    geofence: { inside: false },
    alerts: [],
  };
}

export function mapDevicesToVehicles(devices, positionsByDeviceId = {}) {
  return devices.map((device) => mapDeviceToVehicle(device, positionsByDeviceId[device.id]));
}

export function indexPositions(positions) {
  const map = {};
  (positions ?? []).forEach((position) => {
    map[position.deviceId] = position;
  });
  return map;
}

export function mapEventToNotification(event, devices = []) {
  const device = devices.find((d) => d.id === event.deviceId);
  return {
    id: String(event.id),
    type: event.type === 'alarm' || event.type === 'deviceOverspeed' ? 'alert' : 'info',
    vehicleId: String(event.deviceId),
    title: event.type,
    message: event.attributes?.message || `${device?.name || event.deviceId}: ${event.type}`,
    timestamp: event.eventTime || new Date().toISOString(),
    read: false,
  };
}
