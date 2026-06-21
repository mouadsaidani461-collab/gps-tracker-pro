import { Check, X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useFormatters } from '../../hooks/useFormatters';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';
import {
  normalizeNotificationType,
  NOTIFICATION_TYPE_CONFIG,
} from './notificationTypes';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
  onClick,
}) {
  const { t } = useLocale();
  const { formatRelativeTimeParts } = useFormatters();
  const type = normalizeNotificationType(notification.type);
  const config = NOTIFICATION_TYPE_CONFIG[type] ?? NOTIFICATION_TYPE_CONFIG.info;
  const Icon = config.icon;

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(notification);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(notification)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex gap-3 px-4 py-3 border-b border-slate-600/10',
        'cursor-pointer transition-all duration-200',
        'hover:bg-capture-surface/60',
        !notification.read && 'bg-capture-primary/5 hover:bg-capture-primary/10',
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg shrink-0 border transition-transform duration-200',
          'group-hover:scale-105',
          config.iconBg,
        )}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>

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

          <div className="flex items-center gap-1 shrink-0">
            {!notification.read && onMarkRead && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification.id);
                }}
                className={cn(
                  'capture-notif-action min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md',
                  'text-capture-glow hover:text-capture-primary hover:bg-capture-primary/10',
                  'transition-all duration-200 touch-manipulation',
                )}
                title={t('notifications.markRead')}
                aria-label={t('notifications.markRead')}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(notification.id);
                }}
                className={cn(
                  'capture-notif-action min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md',
                  'text-slate-500 hover:text-rose-300 hover:bg-rose-500/10',
                  'transition-all duration-200 touch-manipulation',
                )}
                title={t('notifications.dismiss')}
                aria-label={t('notifications.dismiss')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
