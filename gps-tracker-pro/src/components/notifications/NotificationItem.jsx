import {
  AlertTriangle, AlertCircle, Info, CheckCircle, Check,
} from 'lucide-react';
import { formatRelativeTimeParts, formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Normalize legacy types → canonical set */
export function normalizeNotificationType(type) {
  if (type === 'alert') return 'critical';
  if (type === 'warning' || type === 'critical' || type === 'info' || type === 'success') {
    return type;
  }
  return 'info';
}

export const NOTIFICATION_TYPE_CONFIG = {
  critical: {
    icon: AlertTriangle,
    iconBg: 'bg-capture-danger/15 text-capture-danger border-capture-danger/30',
    dot: 'bg-capture-danger shadow-[0_0_6px_rgba(244,63,94,0.6)]',
    label: 'حرج',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-capture-warning/15 text-capture-warning border-capture-warning/30',
    dot: 'bg-capture-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]',
    label: 'تحذير',
  },
  info: {
    icon: Info,
    iconBg: 'bg-capture-primary/15 text-capture-glow border-capture-primary/30',
    dot: 'bg-capture-primary shadow-[0_0_6px_rgba(6,182,212,0.6)]',
    label: 'معلومة',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-capture-success/15 text-capture-success border-capture-success/30',
    dot: 'bg-capture-success shadow-[0_0_6px_rgba(16,185,129,0.6)]',
    label: 'نجاح',
  },
};

export function isCriticalNotification(notification) {
  return normalizeNotificationType(notification.type) === 'critical';
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}) {
  const type = normalizeNotificationType(notification.type);
  const config = NOTIFICATION_TYPE_CONFIG[type] ?? NOTIFICATION_TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(notification)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(notification)}
      className={cn(
        'group flex gap-3 px-4 py-3 border-b border-slate-600/10',
        'cursor-pointer transition-all duration-200',
        'hover:bg-capture-surface/60',
        !notification.read && 'bg-capture-primary/5 hover:bg-capture-primary/10',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'p-2 rounded-lg shrink-0 border transition-transform duration-200',
          'group-hover:scale-105',
          config.iconBg,
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!notification.read && (
              <span
                className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)}
                aria-hidden="true"
              />
            )}
            <p className={cn(
              'font-medium text-sm truncate',
              notification.read ? 'text-slate-400' : 'text-slate-100',
            )}
            >
              {notification.title}
            </p>
          </div>

          {!notification.read && onMarkRead && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className={cn(
                'shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100',
                'text-capture-glow hover:text-capture-primary hover:bg-capture-primary/10',
                'transition-all duration-200',
              )}
              title="تحديد كمقروء"
              aria-label="تحديد كمقروء"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <p className={cn(
          'text-xs mt-0.5 line-clamp-2',
          notification.read ? 'text-slate-600' : 'text-slate-400',
        )}
        >
          {notification.message}
        </p>

        <p className="text-[10px] text-slate-500 mt-1.5">
          {(() => {
            const parts = formatRelativeTimeParts(notification.timestamp);
            if (parts.type === 'relative') {
              return (
                <>
                  {parts.prefix}{' '}
                  <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                    {formatNumber(parts.value, { maximumFractionDigits: 0 })}
                  </span>
                  {' '}{parts.suffix}
                </>
              );
            }
            if (parts.type === 'date') {
              return (
                <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{parts.text}</span>
              );
            }
            return parts.text ?? '—';
          })()}
        </p>
      </div>
    </div>
  );
}
