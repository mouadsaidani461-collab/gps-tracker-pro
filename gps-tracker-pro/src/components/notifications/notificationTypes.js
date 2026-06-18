import {
  AlertTriangle, AlertCircle, Info, CheckCircle,
} from 'lucide-react';

export function normalizeNotificationType(type) {
  if (type === 'alert' || type === 'critical') return 'critical';
  if (type === 'warning' || type === 'info' || type === 'success') {
    return type;
  }
  return 'info';
}

export const NOTIFICATION_TYPE_CONFIG = {
  critical: {
    icon: AlertTriangle,
    iconBg: 'bg-capture-danger/15 text-capture-danger border-capture-danger/30',
    dot: 'bg-capture-danger shadow-[0_0_6px_rgba(244,63,94,0.6)]',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-capture-warning/15 text-capture-warning border-capture-warning/30',
    dot: 'bg-capture-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  },
  info: {
    icon: Info,
    iconBg: 'bg-capture-primary/15 text-capture-glow border-capture-primary/30',
    dot: 'bg-capture-primary shadow-[0_0_6px_rgba(6,182,212,0.6)]',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-capture-success/15 text-capture-success border-capture-success/30',
    dot: 'bg-capture-success shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  },
};

export function isCriticalNotification(notification) {
  return normalizeNotificationType(notification.type) === 'critical';
}
