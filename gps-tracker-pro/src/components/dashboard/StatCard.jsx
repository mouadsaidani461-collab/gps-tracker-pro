import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const iconColors = {
  cyan: 'from-capture-primary/20 to-capture-primary/5 text-capture-glow',
  green: 'from-capture-success/20 to-capture-success/5 text-capture-success',
  red: 'from-capture-danger/20 to-capture-danger/5 text-capture-danger',
  violet: 'from-violet-500/20 to-violet-500/5 text-violet-400',
};

const trendStyles = {
  up: 'text-capture-success',
  down: 'text-capture-danger',
  neutral: 'text-capture-metallic',
};

export default function StatCard({
  icon: Icon,
  title,
  value,
  trend,
  trendLabel,
  color = 'cyan',
  className = '',
}) {
  const TrendIcon = trend?.direction === 'up'
    ? TrendingUp
    : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  return (
    <div
      className={cn(
        'group relative rounded-xl p-4',
        'bg-capture-card/60 backdrop-blur-md',
        'border border-slate-600/20',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-capture-primary/30 hover:shadow-glow-sm',
        'before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-slate-400/20 before:to-transparent',
        'before:opacity-0 group-hover:opacity-100 before:transition-opacity',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'p-2.5 rounded-xl bg-gradient-to-br shrink-0',
            'transition-shadow duration-300 group-hover:shadow-glow-sm',
            iconColors[color] ?? iconColors.cyan,
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trendStyles[trend.direction] ?? trendStyles.neutral,
            )}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {trend.numeric != null ? (
              <>
                <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{trend.numeric}</span>
                {trend.suffix ? ` ${trend.suffix}` : null}
              </>
            ) : (
              <span>{trend.text ?? trend.value}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs text-capture-metallic mb-1">{title}</p>
        <p className={cn('text-2xl font-bold text-slate-100 tracking-tight', NUMERIC_DISPLAY_CLASS)} dir="ltr">{value}</p>
        {trendLabel && (
          <p className="text-[10px] text-slate-500 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
