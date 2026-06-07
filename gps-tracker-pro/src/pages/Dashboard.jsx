import { useMemo, useState, useEffect } from 'react';
import { Truck, Activity, AlertTriangle, Users } from 'lucide-react';
import { MAP } from '../utils/constants';
import { formatNumber } from '../utils/formatters';
import { userApi } from '../services/traccarApi';
import StatCard from '../components/dashboard/StatCard';
import VehicleList from '../components/dashboard/VehicleList';
import LiveIndicator from '../components/dashboard/LiveIndicator';
import MapView from '../components/map/MapView';
import { useVehicles } from '../hooks/useVehicles';
import { useGeofences } from '../hooks/useGeofences';
import { useAuth } from '../context/AuthContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const {
    vehicles,
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
  } = useVehicles();

  const {
    geofences,
    loading: geofencesLoading,
    error: geofencesError,
  } = useGeofences();

  const [userCount, setUserCount] = useState(null);

  useEffect(() => {
    if (!isAdmin()) return undefined;
    let cancelled = false;

    userApi.list()
      .then((users) => {
        if (!cancelled) setUserCount(Array.isArray(users) ? users.length : null);
      })
      .catch(() => {
        if (!cancelled) setUserCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const lastFleetUpdate = useMemo(
    () => vehicles.reduce((latest, v) => {
      const t = new Date(v.lastUpdate).getTime();
      return t > latest ? t : latest;
    }, 0),
    [vehicles],
  );

  const activeNow = stats.moving + stats.idle + stats.online;

  const statCards = [
    {
      icon: Truck,
      title: 'إجمالي المركبات',
      value: formatNumber(stats.total, { maximumFractionDigits: 0 }),
      trend: {
        direction: 'up',
        numeric: formatNumber(stats.moving, { maximumFractionDigits: 0 }),
        suffix: 'متحرك',
      },
      trendLabel: 'مركبات على الطريق',
      color: 'cyan',
    },
    {
      icon: Activity,
      title: 'نشط الآن',
      value: formatNumber(activeNow, { maximumFractionDigits: 0 }),
      trend: { direction: 'neutral', text: isConnected ? 'مباشر' : 'غير متصل' },
      trendLabel: 'حالة WebSocket',
      color: 'green',
    },
    {
      icon: AlertTriangle,
      title: 'التنبيهات',
      value: formatNumber(stats.activeAlerts, { maximumFractionDigits: 0 }),
      trend: {
        direction: stats.alert > 0 ? 'down' : 'neutral',
        numeric: formatNumber(stats.alert, { maximumFractionDigits: 0 }),
      },
      trendLabel: 'مركبات بحالة تنبيه',
      color: 'red',
    },
    {
      icon: Users,
      title: 'المستخدمون',
      value: userCount != null
        ? formatNumber(userCount, { maximumFractionDigits: 0 })
        : '—',
      trend: { direction: 'neutral', text: '—' },
      trendLabel: 'حسابات Traccar',
      color: 'violet',
    },
  ];

  const mapLoading = vehiclesLoading || geofencesLoading;
  const mapError = vehiclesError || geofencesError;

  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">لوحة التحكم</h1>
          <p className="text-sm text-capture-metallic mt-1">
            مراقبة الأسطول في الوقت الفعلي — Traccar API
          </p>
        </div>
        <LiveIndicator
          isLive={isSimulating && isConnected}
          lastUpdate={lastFleetUpdate ? new Date(lastFleetUpdate).toISOString() : null}
        />
      </div>

      {mapError && (
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
          {mapError}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 min-h-[520px]">
        <div
          className={cn(
            'lg:col-span-1 flex flex-col min-h-[480px]',
            'rounded-xl p-4',
            'bg-capture-surface/40 backdrop-blur-sm',
            'border border-slate-600/20',
          )}
        >
          <h2 className="text-sm font-semibold text-slate-200 mb-3 shrink-0">
            قائمة المركبات
          </h2>
          {vehiclesLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-capture-metallic">
              جاري تحميل المركبات...
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

        <div className="lg:col-span-2 flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-sm font-semibold text-slate-200">
              الخريطة المباشرة — {MAP.label}
            </h2>
            {selectedVehicle && (
              <button
                type="button"
                onClick={() => selectVehicle(selectedVehicle.id)}
                className="text-xs text-capture-glow hover:text-capture-primary transition-colors"
              >
                توسيط: {selectedVehicle.name}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-[420px] relative">
            {mapLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-capture-bg/60 backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <MapView
              vehicles={vehicles}
              selectedId={selectedId}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={(v) => selectVehicle(v.id)}
              geofences={geofences}
              showVehicleCard={false}
              showRoute={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
