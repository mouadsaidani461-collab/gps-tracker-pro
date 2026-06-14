import { VEHICLE_STATUS_LABELS } from '../../utils/constants';
import { useLocale } from '../../context/LocaleContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const variants = {
  // Notification types
  alert: 'bg-capture-danger/15 text-capture-danger border-capture-danger/30',
  info: 'bg-capture-primary/15 text-capture-glow border-capture-primary/30',
  success: 'bg-capture-success/15 text-capture-success border-capture-success/30',
  warning: 'bg-capture-warning/15 text-capture-warning border-capture-warning/30',

  // Vehicle statuses
  moving: 'bg-capture-primary/15 text-capture-glow border-capture-primary/30',
  idle: 'bg-capture-warning/15 text-capture-warning border-capture-warning/30',
  online: 'bg-capture-success/15 text-capture-success border-capture-success/30',
  offline: 'bg-slate-700/40 text-capture-metallic border-slate-600/30',

  // Generic
  default: 'bg-capture-surface text-capture-metallic border-slate-600/30',
  primary: 'bg-capture-primary/15 text-capture-glow border-capture-primary/30',
  danger: 'bg-capture-danger/15 text-capture-danger border-capture-danger/30',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px] rounded-md',
  md: 'px-2.5 py-1 text-xs rounded-full',
  lg: 'px-3 py-1.5 text-sm rounded-full',
};

const dotColors = {
  alert: 'bg-capture-danger shadow-[0_0_6px_rgba(244,63,94,0.6)]',
  info: 'bg-capture-primary shadow-[0_0_6px_rgba(6,182,212,0.6)]',
  success: 'bg-capture-success shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  warning: 'bg-capture-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  moving: 'bg-capture-primary shadow-[0_0_6px_rgba(6,182,212,0.6)]',
  idle: 'bg-capture-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  online: 'bg-capture-success shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  offline: 'bg-slate-500',
  default: 'bg-capture-metallic',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
}) {
  const label = children ?? VEHICLE_STATUS_LABELS[variant] ?? variant;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        'whitespace-nowrap select-none',
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.md,
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant] ?? dotColors.default,
            pulse && 'animate-pulse',
          )}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

export function StatusBadge({ status, ...props }) {
  const { t } = useLocale();
  const label = t(`vehicles.status.${status}`) || VEHICLE_STATUS_LABELS[status] || status;

  return (
    <Badge variant={status} dot pulse={status === 'alert' || status === 'moving'} {...props}>
      {label}
    </Badge>
  );
}
