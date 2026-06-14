import {
  Gauge, MapPin, Battery, Signal, Fuel, Route, Clock,
} from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { useLocale } from '../../context/LocaleContext';
import { useFormatters } from '../../hooks/useFormatters';
import { formatPlate, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function SignalBars({ strength }) {
  const { formatNumber } = useFormatters();
  const bars = strength > 70 ? 4 : strength > 40 ? 3 : strength > 0 ? 2 : 0;

  return (
    <div
      className="flex items-end gap-0.5 h-3"
      aria-label={`${formatNumber(strength, { maximumFractionDigits: 0 })}%`}
    >
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-sm transition-colors',
            bar <= bars ? 'bg-capture-success' : 'bg-slate-600/50',
          )}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </div>
  );
}

function getTripMetrics(vehicle) {
  const distance = vehicle.odometer / 186.3;
  const hours = vehicle.odometer / 7018;
  return { distance, hours };
}

export default function VehicleCard({
  vehicle,
  isSelected = false,
  onClick,
}) {
  const { t } = useLocale();
  const { formatSpeed, formatFuel, formatDistance, formatDuration } = useFormatters();
  const { distance, hours } = getTripMetrics(vehicle);
  const address = vehicle.location?.address ?? '—';

  return (
    <button
      type="button"
      onClick={() => onClick?.(vehicle)}
      className={cn(
        'relative w-full text-start rounded-xl p-4',
        'bg-capture-card/50 backdrop-blur-sm',
        'border transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:shadow-glow-sm',
        isSelected
          ? 'border-capture-primary/50 bg-capture-primary/5 shadow-glow-sm ring-1 ring-capture-primary/20'
          : 'border-slate-500/25 hover:border-capture-metallic/40',
        'before:absolute before:inset-0 before:rounded-xl before:pointer-events-none',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 truncate">{vehicle.name}</h3>
          <p className="text-xs text-capture-metallic mt-0.5">
            {formatPlate(vehicle.plate)} · {vehicle.driver}
          </p>
        </div>
        <StatusBadge status={vehicle.status} size="sm" />
      </div>

      <div className="space-y-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Gauge className="w-4 h-4 text-capture-glow shrink-0" />
          <span dir="ltr" className={NUMERIC_DISPLAY_CLASS}>{formatSpeed(vehicle.speed)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin className="w-4 h-4 text-capture-primary shrink-0" />
          <span className="truncate text-xs">{address}</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-t border-slate-600/20">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Battery className="w-3.5 h-3.5" />
          <span dir="ltr" className={cn('text-xs', NUMERIC_DISPLAY_CLASS)}>{formatFuel(vehicle.battery)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5 text-slate-500" />
          <SignalBars strength={vehicle.signal} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-600/20">
        <div className="text-center">
          <Fuel className="w-3.5 h-3.5 text-capture-metallic mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">{t('vehicleCard.fuel')}</p>
          <p dir="ltr" className={cn('text-xs font-semibold text-slate-200', NUMERIC_DISPLAY_CLASS)}>{formatFuel(vehicle.fuel)}</p>
        </div>
        <div className="text-center">
          <Route className="w-3.5 h-3.5 text-capture-metallic mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">{t('vehicleCard.distance')}</p>
          <p dir="ltr" className={cn('text-xs font-semibold text-slate-200', NUMERIC_DISPLAY_CLASS)}>{formatDistance(distance)}</p>
        </div>
        <div className="text-center">
          <Clock className="w-3.5 h-3.5 text-capture-metallic mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">{t('vehicleCard.hours')}</p>
          <p dir="ltr" className={cn('text-xs font-semibold text-slate-200', NUMERIC_DISPLAY_CLASS)}>{formatDuration(hours)}</p>
        </div>
      </div>
    </button>
  );
}
