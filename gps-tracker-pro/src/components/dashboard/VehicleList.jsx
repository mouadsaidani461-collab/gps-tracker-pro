import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import VehicleCard from './VehicleCard';
import { VEHICLE_FILTERS } from '../../utils/constants';
import { useLocale } from '../../context/LocaleContext';
import { formatNumber } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function VehicleList({
  vehicles = [],
  filter = 'all',
  onFilterChange,
  selectedId,
  onSelectVehicle,
  searchQuery = '',
  onSearchChange,
}) {
  const { t } = useLocale();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const filtered = useMemo(() => {
    const query = (onSearchChange ? searchQuery : localSearch).trim().toLowerCase();
    if (!query) return vehicles;

    return vehicles.filter((v) =>
      v.name?.toLowerCase().includes(query)
      || v.plate?.toLowerCase().includes(query)
      || v.driver?.toLowerCase().includes(query)
      || v.location?.address?.toLowerCase().includes(query),
    );
  }, [vehicles, searchQuery, localSearch, onSearchChange]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    onSearchChange?.(val);
  };

  const searchValue = onSearchChange ? searchQuery : localSearch;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative mb-3 shrink-0">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="search"
          value={searchValue}
          onChange={handleSearch}
          placeholder={t('vehicles.searchPlaceholder')}
          className={cn(
            'w-full ps-10 pe-4 py-2 rounded-lg text-sm',
            'bg-capture-bg/60 border border-slate-600/30',
            'text-slate-200 placeholder:text-slate-500',
            'focus:outline-none focus:border-capture-primary/50 focus:shadow-glow-sm',
            'transition-all duration-200',
          )}
        />
      </div>

      <div className="flex flex-wrap gap-1 mb-3 shrink-0">
        {VEHICLE_FILTERS.map(({ value }) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange?.(value)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
              filter === value
                ? 'bg-capture-primary/20 text-capture-glow border border-capture-primary/40 shadow-glow-sm'
                : 'bg-capture-surface/60 text-capture-metallic border border-transparent hover:border-slate-600/30 hover:text-slate-300',
            )}
          >
            {t(`vehicles.filters.${value}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pe-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-500">
              {vehicles.length === 0 ? t('vehicles.noResults') : t('vehicles.noMatch')}
            </p>
            {vehicles.length > 0 && (
              <p className="text-xs text-slate-600 mt-1">{t('vehicles.searchEmpty')}</p>
            )}
          </div>
        ) : (
          filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedId === vehicle.id}
              onClick={(v) => onSelectVehicle?.(v.id ?? v)}
            />
          ))
        )}
      </div>

      <p className="text-[10px] text-slate-600 mt-2 shrink-0 text-center">
        {t('vehicles.countFooter', {
          shown: formatNumber(filtered.length, { maximumFractionDigits: 0 }),
          total: formatNumber(vehicles.length, { maximumFractionDigits: 0 }),
        })}
      </p>
    </div>
  );
}
