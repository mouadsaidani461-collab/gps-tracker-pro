import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, List, Search, SlidersHorizontal, Download,
  MapPin, CheckSquare, Square, X, Fuel, Gauge,
  Battery, Signal, Route, Clock, Phone, AlertTriangle,
} from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { formatPlate, formatNumber, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';
import { useLocale } from '../context/LocaleContext';
import { useVehicleFilters, useVehicleStatusLabels, useVehicleTypeLabels } from '../hooks/useVehicleI18n';
import { useFormatters } from '../hooks/useFormatters';
import { formatVehicleRowForExport, rowsToCsv, downloadBlob, exportFilename } from '../utils/exportUtils';
import VehicleCard from '../components/dashboard/VehicleCard';
import { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getVehicleStats(vehicle) {
  return {
    odometerKm: vehicle.odometer ? vehicle.odometer / 1000 : 0,
  };
}

function VehicleDetailModal({ vehicle, open, onClose, onTrackMap }) {
  const { t } = useLocale();
  const {
    formatRelativeTime, formatSpeed, formatFuel, formatDistance, formatOdometer,
  } = useFormatters();
  if (!vehicle) return null;

  const { odometerKm } = getVehicleStats(vehicle);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vehicle.name}
      description={formatPlate(vehicle.plate)}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <Button variant="primary" leftIcon={<MapPin className="w-4 h-4" />} onClick={() => { onTrackMap(vehicle); onClose(); }}>
            {t('vehicles.trackOnMap')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <StatusBadge status={vehicle.status} />
          <span className="text-xs text-slate-500">
            {t('vehicles.lastUpdateShort')}: {formatRelativeTime(vehicle.lastUpdate)}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Gauge, labelKey: 'vehicles.fields.speed', value: formatSpeed(vehicle.speed), numeric: true },
            { icon: Fuel, labelKey: 'vehicles.fields.fuel', value: formatFuel(vehicle.fuel), numeric: true },
            { icon: Battery, labelKey: 'vehicles.fields.battery', value: formatFuel(vehicle.battery), numeric: true },
            { icon: Signal, labelKey: 'vehicles.fields.signal', value: formatFuel(vehicle.signal), numeric: true },
            { icon: Route, labelKey: 'vehicles.fields.odometer', value: formatDistance(odometerKm), numeric: true },
            { icon: Clock, labelKey: 'vehicles.lastUpdateShort', value: formatRelativeTime(vehicle.lastUpdate), numeric: true },
            { icon: MapPin, labelKey: 'vehicles.fields.location', value: vehicle.location?.address ?? '—' },
            { icon: Phone, labelKey: 'vehicles.fields.driver', value: vehicle.driver },
          ].map(({ icon: Icon, labelKey, value, numeric }) => (
            <div key={labelKey} className="flex items-start gap-3 p-3 rounded-lg bg-capture-bg/40 border border-slate-600/20">
              <Icon className="w-4 h-4 text-capture-glow shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-500">{t(labelKey)}</p>
                {numeric ? (
                  <p className="text-sm text-slate-200">
                    <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{value}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-200">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-capture-bg/40 border border-slate-600/20">
          <p className="text-[10px] text-slate-500 mb-1">{t('vehicles.fields.odometer')}</p>
          <p className="text-sm text-slate-200">
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatOdometer(vehicle.odometer)}</span>
          </p>
        </div>

        {vehicle.geofence && (
          <div className="p-3 rounded-lg bg-capture-bg/40 border border-slate-600/20">
            <p className="text-[10px] text-slate-500 mb-1">{t('vehicles.geofenceZone')}</p>
            <p className="text-sm text-slate-200">
              {vehicle.geofence.name}
              <span className={cn('ms-2 text-xs', vehicle.geofence.inside ? 'text-capture-success' : 'text-capture-danger')}>
                ({vehicle.geofence.inside ? t('common.inside') : t('common.outside')})
              </span>
            </p>
          </div>
        )}

        {vehicle.alerts?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-capture-warning" />
              {t('vehicles.alertsTitle')} (
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(vehicle.alerts.length, { maximumFractionDigits: 0 })}
              </span>
              )
            </p>
            <div className="space-y-2">
              {vehicle.alerts.map((a) => (
                <div key={a.id} className="text-xs p-2.5 rounded-lg bg-capture-danger/10 border border-capture-danger/20 text-slate-300">
                  {a.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function VehiclesPage() {
  const navigate = useNavigate();
  const { vehicles, selectVehicle } = useVehicles();
  const { t, language } = useLocale();
  const { formatSpeed, formatFuel } = useFormatters();
  const vehicleFilters = useVehicleFilters();
  const statusLabels = useVehicleStatusLabels();
  const typeOptions = useVehicleTypeLabels();

  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [minFuel, setMinFuel] = useState(0);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [bulkMsg, setBulkMsg] = useState(null);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (typeFilter !== 'all' && v.type !== typeFilter) return false;
      if (v.fuel < minFuel) return false;
      if (alertsOnly && v.alerts.length === 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          v.name.toLowerCase().includes(q)
          || v.plate.toLowerCase().includes(q)
          || v.driver.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vehicles, statusFilter, typeFilter, minFuel, alertsOnly, search]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((v) => v.id)));
    }
  };

  const handleBulkExport = useCallback(() => {
    const selected = vehicles.filter((v) => selectedIds.has(v.id));
    const headers = [
      t('vehicles.exportHeaders.plate'),
      t('vehicles.exportHeaders.name'),
      t('vehicles.exportHeaders.driver'),
      t('vehicles.exportHeaders.status'),
      t('vehicles.exportHeaders.speed'),
      t('vehicles.exportHeaders.fuel'),
    ];
    const rows = selected.map((v) => formatVehicleRowForExport(v, statusLabels[v.status], language));
    downloadBlob(
      rowsToCsv(headers, rows),
      'text/csv;charset=utf-8;',
      exportFilename('vehicles', new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10), 'csv'),
    );
    setBulkMsg(t('vehicles.exportedCount', { count: formatNumber(selected.length, { maximumFractionDigits: 0 }) }));
    setTimeout(() => setBulkMsg(null), 2500);
  }, [vehicles, selectedIds, statusLabels, t, language]);

  const handleTrackMap = (vehicle) => {
    selectVehicle(vehicle.id);
    navigate('/map');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t('vehicles.pageTitle')}</h1>
          <p className="text-sm text-capture-metallic mt-1">
            {t('vehicles.countOf', {
              shown: formatNumber(filtered.length, { maximumFractionDigits: 0 }),
              total: formatNumber(vehicles.length, { maximumFractionDigits: 0 }),
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-600/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2.5 transition-colors',
                viewMode === 'grid' ? 'bg-capture-primary/20 text-capture-glow' : 'text-slate-400 hover:bg-capture-surface/60',
              )}
              aria-label={t('vehicles.viewGrid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2.5 transition-colors',
                viewMode === 'list' ? 'bg-capture-primary/20 text-capture-glow' : 'text-slate-400 hover:bg-capture-surface/60',
              )}
              aria-label={t('vehicles.viewList')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setShowFilters((p) => !p)}
          >
            {t('common.filters')}
          </Button>
        </div>
      </div>

      {/* Search + advanced filters */}
      <div className="capture-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('vehicles.searchPlaceholderPage')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:shadow-glow-sm focus:border-capture-primary/50"
          />
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-600/20 animate-[fade-in_0.2s_ease-out]">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">{t('vehicles.filterStatus')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none"
              >
                {vehicleFilters.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">{t('vehicles.filterType')}</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none"
              >
                <option value="all">{t('common.all')}</option>
                {typeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                {t('vehicles.minFuel')}:{' '}
                <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                  {formatNumber(minFuel, { maximumFractionDigits: 0 })}
                </span>
                %
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minFuel}
                onChange={(e) => setMinFuel(Number(e.target.value))}
                className="w-full accent-capture-primary"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertsOnly}
                  onChange={(e) => setAlertsOnly(e.target.checked)}
                  className="accent-capture-primary"
                />
                <span className="text-sm text-slate-300">{t('vehicles.alertsOnly')}</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="capture-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-[fade-in_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm text-capture-glow font-medium">
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(selectedIds.size, { maximumFractionDigits: 0 })}
              </span>
              {' '}{t('vehicles.bulkSelected')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleBulkExport}>
              {t('common.export')}
            </Button>
          </div>
        </div>
      )}

      {bulkMsg && (
        <p className="text-sm text-capture-success px-4 py-2 rounded-lg bg-capture-success/10 border border-capture-success/30 animate-[fade-in_0.2s_ease-out]">
          {bulkMsg}
        </p>
      )}

      {/* Select all */}
      {filtered.length > 0 && (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-xs text-capture-metallic hover:text-capture-glow transition-colors"
        >
          {selectedIds.size === filtered.length
            ? <CheckSquare className="w-4 h-4 text-capture-glow" />
            : <Square className="w-4 h-4" />}
          {selectedIds.size === filtered.length ? t('vehicles.deselectAll') : t('common.selectAll')}
        </button>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((vehicle) => (
            <div key={vehicle.id} className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleSelect(vehicle.id); }}
                className="absolute top-3 start-3 z-10 p-1 rounded bg-capture-card/80 border border-slate-600/30"
              >
                {selectedIds.has(vehicle.id)
                  ? <CheckSquare className="w-4 h-4 text-capture-glow" />
                  : <Square className="w-4 h-4 text-slate-500" />}
              </button>
              <VehicleCard
                vehicle={vehicle}
                isSelected={selectedIds.has(vehicle.id)}
                onClick={() => setDetailVehicle(vehicle)}
              />
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="capture-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600/20 bg-capture-bg/40">
                  <th className="w-10 px-3 py-3" />
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">{t('vehicles.table.vehicle')}</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">{t('vehicles.table.driver')}</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">{t('vehicles.table.status')}</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">{t('vehicles.table.speed')}</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">{t('vehicles.table.fuel')}</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">{t('vehicles.table.location')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    onClick={() => setDetailVehicle(vehicle)}
                    className={cn(
                      'border-b border-slate-600/10 cursor-pointer transition-colors',
                      'hover:bg-capture-surface/40',
                      selectedIds.has(vehicle.id) && 'bg-capture-primary/5',
                    )}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(vehicle.id); }}
                      >
                        {selectedIds.has(vehicle.id)
                          ? <CheckSquare className="w-4 h-4 text-capture-glow" />
                          : <Square className="w-4 h-4 text-slate-500" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{vehicle.name}</p>
                      <p className="text-xs text-slate-500">{formatPlate(vehicle.plate)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{vehicle.driver}</td>
                    <td className="px-4 py-3"><StatusBadge status={vehicle.status} size="sm" /></td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatSpeed(vehicle.speed)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatFuel(vehicle.fuel)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 truncate max-w-[180px]">{vehicle.location?.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="capture-card py-16 text-center">
          <p className="text-slate-500">{t('vehicles.noMatch')}</p>
        </div>
      )}

      {/* Detail modal */}
      <VehicleDetailModal
        vehicle={detailVehicle}
        open={!!detailVehicle}
        onClose={() => setDetailVehicle(null)}
        onTrackMap={handleTrackMap}
      />
    </div>
  );
}
