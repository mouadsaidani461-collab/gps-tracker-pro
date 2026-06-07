/**
 * Arabic labels for Traccar event types — shared by reports and notifications.
 */

export const EVENT_LABELS = {
  deviceOverspeed: 'تجاوز السرعة',
  geofenceEnter: 'دخول منطقة',
  geofenceExit: 'خروج منطقة',
  alarm: 'إنذار',
  deviceMoving: 'حركة',
  deviceStopped: 'توقف',
  deviceOffline: 'غير متصل',
  deviceOnline: 'اتصال',
  maintenance: 'صيانة',
  deviceFuelDrop: 'انخفاض وقود',
  ignitionOn: 'تشغيل المحرك',
  ignitionOff: 'إيقاف المحرك',
};

export function eventLabel(type) {
  return EVENT_LABELS[type] ?? type ?? 'حدث';
}

export function deviceDisplayName(device) {
  if (device?.name) return device.name;
  if (device?.uniqueId) return device.uniqueId;
  return 'مركبة غير معروفة';
}
