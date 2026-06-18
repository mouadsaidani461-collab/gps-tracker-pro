/**
 * Capture Tracking GPS — Application Constants
 */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Capture Tracking GPS';
export const APP_NAME_AR = 'كابتشر للتتبع GPS';
export const APP_VERSION = '1.0.0';

// ── Brand Colors (mirrors tailwind.config.js / index.css tokens) ──
export const COLORS = {
  bg: '#020617',
  surface: '#0f172a',
  card: '#1e293b',
  primary: '#06b6d4',
  glow: '#67e8f9',
  metallic: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
  border: 'rgba(148, 163, 184, 0.12)',
};

// ── Map Defaults (Morocco) ──
export const MAP = {
  center: [31.7917, -7.0926],
  defaultZoom: 6,
  selectedZoom: 13,
  minZoom: 5,
  maxZoom: 18,
  country: 'MA',
  label: 'المغرب',
};

// ── Auth ──
export const AUTH = {
  tokenKey: 'capture_auth_token',
  userKey: 'capture_auth_user',
  expiryKey: 'capture_auth_expiry',
  tokenTTL: 8 * 60 * 60 * 1000,
};

// ── Vehicle Statuses ──
export const VEHICLE_STATUS = {
  MOVING: 'moving',
  IDLE: 'idle',
  ONLINE: 'online',
  OFFLINE: 'offline',
  ALERT: 'alert',
};

export const VEHICLE_STATUS_LABELS = {
  moving: 'متحرك',
  idle: 'متوقف',
  online: 'متصل',
  offline: 'غير متصل',
  alert: 'تنبيه',
};

export const VEHICLE_STATUS_COLORS = {
  moving: COLORS.primary,
  idle: COLORS.warning,
  online: COLORS.success,
  offline: COLORS.metallic,
  alert: COLORS.danger,
};

// ── Vehicle Types ──
export const VEHICLE_TYPES = {
  CAR: 'car',
  TRUCK: 'truck',
  VAN: 'van',
  BUS: 'bus',
  MOTORCYCLE: 'motorcycle',
};

export const VEHICLE_TYPE_LABELS = {
  car: 'سيارة',
  truck: 'شاحنة',
  van: 'شاحنة صغيرة',
  bus: 'حافلة',
  motorcycle: 'دراجة نارية',
};

// ── Alert Types ──
export const ALERT_TYPES = {
  SPEED: 'speed',
  GEOFENCE: 'geofence',
  BATTERY: 'battery',
  FUEL: 'fuel',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
};

export const ALERT_TYPE_LABELS = {
  speed: 'تجاوز السرعة',
  geofence: 'خروج عن المنطقة',
  battery: 'بطارية منخفضة',
  fuel: 'وقود منخفض',
  offline: 'انقطاع الاتصال',
  maintenance: 'صيانة مطلوبة',
};

export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

// ── Notification Types ──
export const NOTIFICATION_TYPES = {
  ALERT: 'alert',
  INFO: 'info',
  SUCCESS: 'success',
};

// ── Filter Options ──
export const VEHICLE_FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'moving', label: 'متحرك' },
  { value: 'idle', label: 'متوقف' },
  { value: 'online', label: 'متصل' },
  { value: 'offline', label: 'غير متصل' },
  { value: 'alert', label: 'تنبيه' },
];

// ── Simulation Intervals (ms) ──
export const SIMULATION = {
  vehicleUpdateInterval: 5000,
  notificationInterval: 15000,
  websocketReconnectDelay: 3000,
};

// ── Geofences (Traccar API — no localStorage) ──
export const GEOFENCE_COLORS = [
  '#06b6d4',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#3b82f6',
];

export const GEOFENCE_DEFAULTS = {
  radius: 1500,
  minRadius: 200,
  maxRadius: 15000,
  minPolygonPoints: 3,
};

export const GEOFENCE_TYPES = {
  CIRCLE: 'circle',
  POLYGON: 'polygon',
};

export const MOROCCO_CITY_PRESETS = [
  { id: 'casablanca', center: [33.5731, -7.5898] },
  { id: 'rabat', center: [34.0209, -6.8416] },
  { id: 'marrakech', center: [31.6295, -7.9811] },
  { id: 'fes', center: [34.0181, -5.0078] },
  { id: 'tangier', center: [35.7595, -5.8340] },
  { id: 'agadir', center: [30.4278, -9.5981] },
];

// ── Localisation ──
export const LOCALE = {
  default: 'ar-MA',
  fallback: 'ar',
  supported: ['ar', 'fr', 'en'],
};

// ── Units ──
export const UNITS = {
  speed: 'كم/س',
  distance: 'كم',
  fuel: '%',
  battery: '%',
  signal: '%',
};

// ── Dashboard Stats Keys ──
export const DASHBOARD_STATS = {
  totalVehicles: 'totalVehicles',
  active: 'active',
  alerts: 'alerts',
  users: 'users',
};

export default {
  APP_NAME,
  APP_NAME_AR,
  COLORS,
  MAP,
  AUTH,
  VEHICLE_STATUS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPES,
  ALERT_TYPES,
  NOTIFICATION_TYPES,
  SIMULATION,
  LOCALE,
  UNITS,
};
