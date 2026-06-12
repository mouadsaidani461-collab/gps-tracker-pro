import { Route, Gauge, Car, AlertTriangle, OctagonPause } from 'lucide-react';

export const PAGE_SIZE = 5;

export const REPORT_TYPES = [
  { id: 'trips', icon: Route, color: 'from-capture-primary/30 to-capture-primary/5', iconColor: 'text-capture-glow' },
  { id: 'stops', icon: OctagonPause, color: 'from-violet-500/30 to-violet-500/5', iconColor: 'text-violet-300' },
  { id: 'speed', icon: Gauge, color: 'from-capture-warning/30 to-capture-warning/5', iconColor: 'text-capture-warning' },
  { id: 'vehicles', icon: Car, color: 'from-capture-success/30 to-capture-success/5', iconColor: 'text-capture-success' },
  { id: 'alerts', icon: AlertTriangle, color: 'from-capture-danger/30 to-capture-danger/5', iconColor: 'text-capture-danger' },
];

export const DATE_PRESET_IDS = ['today', 'week', 'month', 'custom'];

export const DATE_PRESETS = DATE_PRESET_IDS.map((id) => ({ id }));

export const TABLE_COLUMN_KEYS = ['vehicle', 'driver', 'type', 'date', 'distance', 'duration', 'status'];

export const STATUS_KEYS = ['completed', 'warning', 'alert'];

export const CHART_COLORS = {
  primary: '#06b6d4',
  glow: '#67e8f9',
  grid: 'rgba(148,163,184,0.1)',
  text: '#94a3b8',
};
