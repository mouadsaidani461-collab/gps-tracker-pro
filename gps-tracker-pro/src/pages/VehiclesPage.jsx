import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, List, Search, SlidersHorizontal, Download,
  MapPin, Bell, CheckSquare, Square, X, Fuel, Gauge,
  Battery, Signal, Route, Clock, Phone, AlertTriangle,
} from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import {
  VEHICLE_FILTERS, VEHICLE_TYPE_LABELS, VEHICLE_TYPES,
  VEHICLE_STATUS_LABELS,
} from '../utils/constants';
import {
  formatSpeed, formatFuel, formatDistance, formatDuration,
  formatPlate, formatRelativeTime, formatOdometer, formatNumber, NUMERIC_DISPLAY_CLASS,
} from '../utils/formatters';
import VehicleCard from '../components/dashboard/VehicleCard';
import { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const TYPE_OPTIONS = Object.entries(VEHICLE_TYPES).map(([, value]) => ({
  value,
  label: VEHICLE_TYPE_LABELS[value],
}));

function getVehicleStats(vehicle) {
  return {
    odometerKm: vehicle.odometer ? vehicle.odometer / 1000 : 0,
  };
}

function VehicleDetailModal({ vehicle, open, onClose, onTrackMap }) {
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
          <Button variant="secondary" onClick={onClose}>إغلاق</Button>
          <Button variant="primary" leftIcon={<MapPin className="w-4 h-4" />} onClick={() => { onTrackMap(vehicle); onClose(); }}>
            تتبع على الخريطة
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <StatusBadge status={vehicle.status} />
          <span className="text-xs text-slate-500">
            آخر تحديث: {formatRelativeTime(vehicle.lastUpdate)}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Gauge, label: 'السرعة', value: formatSpeed(vehicle.speed), numeric: true },
            { icon: Fuel, label: 'الوقود', value: formatFuel(vehicle.fuel), numeric: true },
            { icon: Battery, label: 'البطارية', value: formatFuel(vehicle.battery), numeric: true },
            { icon: Signal, label: 'الإشارة', value: formatFuel(vehicle.signal), numeric: true },
            { icon: Route, label: 'عداد المسافة', value: formatDistance(odometerKm), numeric: true },
            { icon: Clock, label: 'آخر تحديث', value: formatRelativeTime(vehicle.lastUpdate), numeric: true },
            { icon: MapPin, label: 'الموقع', value: vehicle.location?.address ?? '—' },
            { icon: Phone, label: 'السائق', value: vehicle.driver },
          ].map(({ icon: Icon, label, value, numeric }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-capture-bg/40 border border-slate-600/20">
              <Icon className="w-4 h-4 text-capture-glow shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-500">{label}</p>
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
          <p className="text-[10px] text-slate-500 mb-1">عداد المسافة</p>
          <p className="text-sm text-slate-200">
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatOdometer(vehicle.odometer)}</span>
          </p>
        </div>

        {vehicle.geofence && (
          <div className="p-3 rounded-lg bg-capture-bg/40 border border-slate-600/20">
            <p className="text-[10px] text-slate-500 mb-1">المنطقة الجغرافية</p>
            <p className="text-sm text-slate-200">
              {vehicle.geofence.name}
              <span className={cn('ms-2 text-xs', vehicle.geofence.inside ? 'text-capture-success' : 'text-capture-danger')}>
                ({vehicle.geofence.inside ? 'داخل' : 'خارج'})
              </span>
            </p>
          </div>
        )}

        {vehicle.alerts?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-capture-warning" />
              التنبيهات (
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
    const headers = ['اللوحة', 'الاسم', 'السائق', 'الحالة', 'السرعة', 'الوقود'];
    const rows = selected.map((v) => [
      v.plate, v.name, v.driver,
      VEHICLE_STATUS_LABELS[v.status],
      v.speed, v.fuel,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicles-export.csv';
    link.click();
    URL.revokeObjectURL(url);
    setBulkMsg(`تم تصدير ${formatNumber(selected.length, { maximumFractionDigits: 0 })} مركبة`);
    setTimeout(() => setBulkMsg(null), 2500);
  }, [vehicles, selectedIds]);

  const handleBulkAlert = useCallback(() => {
    setBulkMsg(`تم إرسال تنبيه لـ ${formatNumber(selectedIds.size, { maximumFractionDigits: 0 })} مركبة`);
    setTimeout(() => setBulkMsg(null), 2500);
  }, [selectedIds]);

  const handleTrackMap = (vehicle) => {
    selectVehicle(vehicle.id);
    navigate('/map');
  };

  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">المركبات</h1>
          <p className="text-sm text-capture-metallic mt-1">
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(filtered.length, { maximumFractionDigits: 0 })}</span>
            {' '}من{' '}
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(vehicles.length, { maximumFractionDigits: 0 })}</span>
            {' '}مركبة
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
              aria-label="عرض شبكي"
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
              aria-label="عرض قائمة"
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
            فلاتر
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
            placeholder="بحث بالاسم، اللوحة، السائق..."
            className="w-full ps-10 pe-4 py-2.5 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:shadow-glow-sm focus:border-capture-primary/50"
          />
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-600/20 animate-[fade-in_0.2s_ease-out]">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none"
              >
                {VEHICLE_FILTERS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">النوع</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none"
              >
                <option value="all">الكل</option>
                {TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                الحد الأدنى للوقود:{' '}
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
                <span className="text-sm text-slate-300">تنبيهات فقط</span>
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
              {' '}محدد
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleBulkExport}>
              تصدير
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Bell className="w-4 h-4" />} onClick={handleBulkAlert}>
              إرسال تنبيه
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
          {selectedIds.size === filtered.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
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
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">المركبة</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">السائق</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">الحالة</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">السرعة</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">الوقود</th>
                  <th className="text-start px-4 py-3 text-slate-400 font-semibold">الموقع</th>
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
          <p className="text-slate-500">لا توجد مركبات تطابق الفلاتر</p>
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
