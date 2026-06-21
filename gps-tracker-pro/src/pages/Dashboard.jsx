import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon, List } from 'lucide-react';
import { formatNumber } from '../utils/formatters';
import { userApi } from '../services/traccarApi';
import StatCard from '../components/dashboard/StatCard';
import VehicleList from '../components/dashboard/VehicleList';
import LiveIndicator from '../components/dashboard/LiveIndicator';
import MapView from '../components/map/MapView';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useVehicles } from '../hooks/useVehicles';
import { useGeofences } from '../hooks/useGeofences';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getLatestFleetTimestamp } from './map/utils';
import { buildDashboardStatCards } from './dashboard/stats';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl p-4 bg-capture-card/60 border border-slate-600/20 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-2 w-20" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { dir, t } = useLocale();
  const {
    vehicles,
    positionedVehicles,
    filteredVehicles,
    selectedVehicle,
    selectedId,
    filter,
    stats,
    loading: vehiclesLoading,
    error: vehiclesError,
    isSimulating,
    isConnected,
    setFilter,
    selectVehicle,
    refreshFleet,
  } = useVehicles();

  const {
    geofences,
    loading: geofencesLoading,
    error: geofencesError,
    refreshGeofences,
  } = useGeofences();

  const [userCount, setUserCount] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [vehicleFlyTrigger, setVehicleFlyTrigger] = useState(0);
  const [mobilePanel, setMobilePanel] = useState('list');

  const adminUser = isAdmin();

  useEffect(() => {
    if (!adminUser) {
      setUserCount(null);
      setUsersLoading(false);
      return undefined;
    }

    let cancelled = false;
    setUsersLoading(true);

    userApi.list()
      .then((users) => {
        if (!cancelled) {
          setUserCount(Array.isArray(users) ? users.length : null);
        }
      })
      .catch(() => {
        if (!cancelled) setUserCount(null);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adminUser]);

  const lastFleetUpdate = useMemo(() => getLatestFleetTimestamp(vehicles), [vehicles]);
  const activeNow = stats.moving + stats.idle + stats.online;
  const notAvailable = t('common.notAvailable');

  const statCards = useMemo(
    () => buildDashboardStatCards({
      t,
      formatNumber,
      stats,
      activeNow,
      isConnected,
      isAdmin: adminUser,
      userCount,
      usersLoading,
      geofencesCount: geofences.length,
      notAvailable,
      loading: vehiclesLoading,
    }),
    [
      t,
      stats,
      activeNow,
      isConnected,
      adminUser,
      userCount,
      usersLoading,
      geofences.length,
      notAvailable,
      vehiclesLoading,
    ],
  );

  const mapLoading = vehiclesLoading || geofencesLoading;

  return (
    <div dir={dir} className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{t('dashboard.title')}</h1>
          <p className="text-xs sm:text-sm text-capture-metallic mt-0.5 sm:mt-1 hidden sm:block">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="w-full sm:w-auto flex justify-start sm:justify-end">
          <LiveIndicator
            isLive={isSimulating && isConnected}
            lastUpdate={lastFleetUpdate ? new Date(lastFleetUpdate).toISOString() : null}
          />
        </div>
      </div>

      {(vehiclesError || geofencesError) && (
        <div className="space-y-2">
          {vehiclesError && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
              <span>{vehiclesError}</span>
              <Button variant="secondary" size="sm" onClick={refreshFleet}>
                {t('common.retry')}
              </Button>
            </div>
          )}
          {geofencesError && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
              <span>{geofencesError}</span>
              <Button variant="secondary" size="sm" onClick={refreshGeofences}>
                {t('common.retry')}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
        {vehiclesLoading ? (
          Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
        ) : (
          statCards.map((card) => (
            <StatCard key={card.id} {...card} />
          ))
        )}
      </div>

      <div className="lg:hidden flex p-1 rounded-xl bg-capture-surface/60 border border-slate-600/20">
        {[
          { id: 'list', label: t('dashboard.mobileTabList'), icon: List },
          { id: 'map', label: t('dashboard.mobileTabMap'), icon: MapIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePanel(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all touch-manipulation',
              mobilePanel === id
                ? 'bg-capture-primary/15 text-capture-glow shadow-glow-sm'
                : 'text-capture-metallic',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 lg:min-h-[520px]">
        <div
          className={cn(
            'lg:col-span-1 flex flex-col',
            'lg:min-h-[480px]',
            mobilePanel === 'map' ? 'hidden lg:flex' : 'flex',
            'max-lg:min-h-[min(420px,calc(100dvh-22rem))]',
            'rounded-xl p-3 sm:p-4',
            'bg-capture-surface/40 backdrop-blur-sm',
            'border border-slate-600/20',
          )}
        >
          <h2 className="text-sm font-semibold text-slate-200 mb-3 shrink-0">
            {t('dashboard.vehicleList')}
          </h2>
          {vehiclesLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-capture-metallic">
              {t('dashboard.loadingVehicles')}
            </div>
          ) : (
            <VehicleList
              vehicles={filteredVehicles}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelectVehicle={selectVehicle}
            />
          )}
        </div>

        <div
          className={cn(
            'lg:col-span-2 flex flex-col lg:min-h-[480px]',
            mobilePanel === 'list' ? 'hidden lg:flex' : 'flex',
            'max-lg:min-h-[min(52dvh,480px)]',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
            <h2 className="text-sm font-semibold text-slate-200">
              {t('dashboard.liveMap')} — {t('map.morocco')}
            </h2>
            <div className="flex items-center gap-3">
              {selectedVehicle && (
                <button
                  type="button"
                  onClick={() => setVehicleFlyTrigger((n) => n + 1)}
                  className="text-xs text-capture-glow hover:text-capture-primary transition-colors"
                  aria-label={`${t('dashboard.centerOn')} ${selectedVehicle.name}`}
                >
                  {t('dashboard.centerOn')}: {selectedVehicle.name}
                </button>
              )}
              <Link
                to="/map"
                className="inline-flex items-center gap-1.5 text-xs text-capture-metallic hover:text-capture-glow transition-colors"
              >
                <MapIcon className="w-3.5 h-3.5" />
                {t('dashboard.openFullMap')}
              </Link>
            </div>
          </div>
          <div className="flex-1 min-h-[280px] lg:min-h-[420px] relative">
            {mapLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-capture-bg/60 backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <MapView
              vehicles={positionedVehicles}
              selectedId={selectedId}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={(v) => selectVehicle(v.id)}
              geofences={geofences}
              showVehicleCard={false}
              showRoute={false}
              vehicleFlyTrigger={vehicleFlyTrigger}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
