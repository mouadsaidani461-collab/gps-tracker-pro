import { useMemo } from 'react';
import { Car, Filter } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useVehicles } from '../../hooks/useVehicles';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const MODES = ['all', 'allowlist', 'blocklist'];

export default function NotificationDeviceFilter({
  mode = 'all',
  deviceIds = [],
  onModeChange,
  onDeviceIdsChange,
}) {
  const { t } = useLocale();
  const { vehicles, loading } = useVehicles();

  const selectedSet = useMemo(() => new Set(deviceIds.map(String)), [deviceIds]);

  const toggleDevice = (id) => {
    const key = String(id);
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onDeviceIdsChange([...next]);
  };

  const showDeviceList = mode === 'allowlist' || mode === 'blocklist';

  return (
    <div className="rounded-xl bg-capture-bg/40 border border-slate-600/20 px-4 py-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg border shrink-0 bg-capture-primary/15 text-capture-glow border-capture-primary/30">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{t('settings.notifications.deviceFilter.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.notifications.deviceFilter.description')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              mode === value
                ? 'bg-capture-primary/20 text-capture-glow border-capture-primary/40'
                : 'text-slate-400 border-slate-600/30 hover:border-slate-500/50 hover:text-slate-200',
            )}
          >
            {t(`settings.notifications.deviceFilter.modes.${value}`)}
          </button>
        ))}
      </div>

      {showDeviceList && (
        <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
          {loading && (
            <p className="text-xs text-slate-500">{t('common.loading')}</p>
          )}
          {!loading && vehicles.length === 0 && (
            <p className="text-xs text-slate-500">{t('settings.notifications.deviceFilter.noDevices')}</p>
          )}
          {vehicles.map((vehicle) => {
            const checked = selectedSet.has(String(vehicle.deviceId ?? vehicle.id));
            return (
              <label
                key={vehicle.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                  checked
                    ? 'border-capture-primary/40 bg-capture-primary/10'
                    : 'border-slate-600/20 hover:border-slate-500/40',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDevice(vehicle.deviceId ?? vehicle.id)}
                  className="accent-capture-primary shrink-0"
                />
                <Car className="w-3.5 h-3.5 text-capture-metallic shrink-0" />
                <span className="text-sm text-slate-200 truncate">{vehicle.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
