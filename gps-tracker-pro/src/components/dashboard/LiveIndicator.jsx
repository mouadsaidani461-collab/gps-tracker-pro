import { useState, useEffect } from 'react';
import { SIMULATION } from '../../utils/constants';
import { formatRelativeTime, formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function LiveIndicator({
  isLive = true,
  interval = SIMULATION.vehicleUpdateInterval,
  lastUpdate,
}) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const update = () => {
      if (lastUpdate) {
        const diff = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);
        setSecondsAgo(Math.max(0, diff));
      } else {
        setSecondsAgo(0);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-capture-surface/80 border border-slate-600/25',
        'text-xs font-medium',
      )}
    >
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-capture-primary opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            isLive ? 'bg-capture-primary shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-500',
          )}
        />
      </span>

      <span className={isLive ? 'text-capture-glow' : 'text-slate-500'}>
        {isLive ? 'مباشر' : 'متوقف'}
      </span>

      <span className="text-slate-500">·</span>

      <span className={cn('text-slate-400', NUMERIC_DISPLAY_CLASS)} dir="ltr">
        {lastUpdate ? (
          secondsAgo < 60 ? (
            <>
              {'منذ '}
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(secondsAgo, { maximumFractionDigits: 0 })}
              </span>
              {' ث'}
            </>
          ) : (
            formatRelativeTime(lastUpdate)
          )
        ) : (
          <>
            {'كل '}
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
              {formatNumber(interval / 1000, { maximumFractionDigits: 0 })}
            </span>
            {' ث'}
          </>
        )}
      </span>
    </div>
  );
}
