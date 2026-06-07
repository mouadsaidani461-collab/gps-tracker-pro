import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Route, Gauge, Car, AlertTriangle, Download, Calendar,
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  FileSpreadsheet, FileText, Check,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useVehicles } from '../hooks/useVehicles';
import { useReports } from '../hooks/useReports';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatDistance, formatDuration, formatNumber, formatDate, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';
import {
  exportFilename,
  formatReportRowForExport,
  rowsToCsv,
  downloadBlob,
  exportReportPdf,
  exportReportExcel,
} from '../utils/exportUtils';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Report rows loaded from Traccar API via useReports

const REPORT_TYPES = [
  { id: 'trips', label: 'الرحلات', icon: Route, color: 'from-capture-primary/30 to-capture-primary/5', iconColor: 'text-capture-glow' },
  { id: 'speed', label: 'السرعة', icon: Gauge, color: 'from-capture-warning/30 to-capture-warning/5', iconColor: 'text-capture-warning' },
  { id: 'vehicles', label: 'المركبات', icon: Car, color: 'from-capture-success/30 to-capture-success/5', iconColor: 'text-capture-success' },
  { id: 'alerts', label: 'التنبيهات', icon: AlertTriangle, color: 'from-capture-danger/30 to-capture-danger/5', iconColor: 'text-capture-danger' },
];

const DATE_PRESETS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'الأسبوع' },
  { id: 'month', label: 'الشهر' },
  { id: 'custom', label: 'مخصص' },
];

const STATUS_BADGE = {
  completed: { variant: 'success', label: 'مكتمل' },
  warning: { variant: 'warning', label: 'تحذير' },
  alert: { variant: 'danger', label: 'تنبيه' },
};

const PAGE_SIZE = 5;

const COLUMNS = [
  { key: 'vehicle', label: 'المركبة' },
  { key: 'driver', label: 'السائق' },
  { key: 'type', label: 'النوع' },
  { key: 'date', label: 'التاريخ' },
  { key: 'distance', label: 'المسافة (كم)' },
  { key: 'duration', label: 'المدة (س)' },
  { key: 'status', label: 'الحالة' },
];

const CHART_COLORS = {
  primary: '#06b6d4',
  glow: '#67e8f9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  grid: 'rgba(148,163,184,0.1)',
  text: '#94a3b8',
};

function formatDateStr(d) {
  return d.toISOString().split('T')[0];
}

/** ISO date key (YYYY-MM-DD) → localized display with Western digits */
function formatReportDateKey(dateKey, options = {}) {
  if (!dateKey) return '—';
  return formatDate(`${dateKey}T00:00:00`, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    numberingSystem: 'latn',
    ...options,
  });
}

const DATE_INPUT_CLASS = cn(
  'px-3 py-2 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none focus:shadow-glow-sm',
  NUMERIC_DISPLAY_CLASS,
);

function getPresetRange(presetId) {
  const today = new Date();
  const end = formatDateStr(today);

  if (presetId === 'today') return { from: end, to: end };
  if (presetId === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: formatDateStr(from), to: end };
  }
  if (presetId === 'month') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: formatDateStr(from), to: end };
  }
  return null;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(label)
    ? formatReportDateKey(label, { month: 'long', day: 'numeric', year: 'numeric' })
    : label;
  return (
    <div className="bg-capture-card/95 backdrop-blur-md border border-slate-600/30 rounded-lg px-3 py-2 text-xs shadow-glow-sm">
      <p className="text-slate-300 mb-1">
        <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{dateLabel}</span>
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{' '}
          <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
            {formatNumber(entry.value, { maximumFractionDigits: 1 })}
          </span>
        </p>
      ))}
    </div>
  );
}

function VehicleMultiSelect({ vehicles = [], selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (plate) => {
    onChange(
      selected.includes(plate)
        ? selected.filter((p) => p !== plate)
        : [...selected, plate],
    );
  };

  const labelContent = selected.length === 0
    ? 'جميع المركبات'
    : selected.length === 1
      ? selected[0]
      : (
        <>
          <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(selected.length, { maximumFractionDigits: 0 })}</span>
          {' '}مركبات
        </>
      );

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">المركبات</label>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex items-center justify-between gap-2 min-w-[180px] px-3 py-2 rounded-lg text-sm',
          'bg-capture-bg/60 border border-slate-600/30 text-slate-200',
          'hover:border-capture-primary/40 focus:outline-none focus:shadow-glow-sm',
          'transition-all duration-200',
        )}
      >
        <span className="truncate">{labelContent}</span>
        <ChevronDown className={cn('w-4 h-4 text-capture-metallic transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute start-0 mt-1 w-64 z-30 bg-capture-card/95 backdrop-blur-xl border border-slate-600/25 rounded-xl shadow-glow-md overflow-hidden animate-[fade-in_0.15s_ease-out]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600/20">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] text-capture-glow hover:text-capture-primary"
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => onChange(vehicles.map((v) => v.plate))}
              className="text-[10px] text-capture-metallic hover:text-slate-300"
            >
              تحديد الكل
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {vehicles.map((v) => {
              const checked = selected.includes(v.plate);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggle(v.plate)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start',
                    'hover:bg-capture-surface/60 transition-colors',
                    checked && 'bg-capture-primary/10 text-capture-glow',
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    checked ? 'bg-capture-primary border-capture-primary' : 'border-slate-600',
                  )}
                  >
                    {checked && <Check className="w-3 h-3 text-slate-950" />}
                  </span>
                  <span className="truncate">{v.plate} — {v.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { vehicles } = useVehicles();
  const weekRange = getPresetRange('week');
  const [selectedType, setSelectedType] = useState('trips');
  const [datePreset, setDatePreset] = useState('week');
  const [dateFrom, setDateFrom] = useState(weekRange?.from ?? formatDateStr(new Date()));
  const [dateTo, setDateTo] = useState(weekRange?.to ?? formatDateStr(new Date()));
  const [selectedVehiclePlates, setSelectedVehiclePlates] = useState([]);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [exportMsg, setExportMsg] = useState(null);

  const selectedDeviceIds = useMemo(() => {
    if (selectedVehiclePlates.length === 0) return vehicles.map((v) => v.deviceId ?? Number(v.id));
    return vehicles
      .filter((v) => selectedVehiclePlates.includes(v.plate))
      .map((v) => v.deviceId ?? Number(v.id));
  }, [vehicles, selectedVehiclePlates]);

  const { rows: reportRows, loading, error, refetch } = useReports({
    reportType: selectedType,
    dateFrom,
    dateTo,
    deviceIds: selectedDeviceIds,
    vehicles,
  });

  const applyPreset = useCallback((presetId) => {
    setDatePreset(presetId);
    if (presetId !== 'custom') {
      const range = getPresetRange(presetId);
      if (range) {
        setDateFrom(range.from);
        setDateTo(range.to);
      }
    }
    setPage(1);
  }, []);

  const filteredData = useMemo(() => reportRows, [reportRows]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'ar')
        : String(bv).localeCompare(String(av), 'ar');
    });
    return sorted;
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const paginatedData = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chartTrendData = useMemo(() => {
    const byDate = {};
    filteredData.forEach((row) => {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date, distance: 0, count: 0 };
      byDate[row.date].distance += row.distance;
      byDate[row.date].count += 1;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const chartBarData = useMemo(() => {
    const byVehicle = {};
    filteredData.forEach((row) => {
      if (!byVehicle[row.vehicle]) byVehicle[row.vehicle] = { vehicle: row.vehicle, total: 0 };
      byVehicle[row.vehicle].total += row.distance;
    });
    return Object.values(byVehicle).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-capture-glow" />
      : <ChevronDown className="w-3.5 h-3.5 text-capture-glow" />;
  };

  const handleExport = async (format) => {
    const headers = COLUMNS.map((c) => c.label);
    const rows = sortedData.map((r) => {
      const formatted = formatReportRowForExport(r, STATUS_BADGE[r.status]?.label);
      return [formatted.vehicle, formatted.driver, formatted.type, formatted.date, formatted.distance, formatted.duration, formatted.status];
    });
    const baseName = exportFilename(`capture-${selectedType}`, dateFrom, dateTo, format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv');

    try {
      if (format === 'csv') {
        downloadBlob(rowsToCsv(headers, rows), 'text/csv;charset=utf-8;', baseName);
        setExportMsg('تم تصدير CSV بنجاح');
      } else if (format === 'excel') {
        await exportReportExcel({
          sheetName: selectedType,
          headers,
          rows,
          filename: baseName.endsWith('.xlsx') ? baseName : `${baseName}.xlsx`,
        });
        setExportMsg('تم تصدير Excel بنجاح');
      } else if (format === 'pdf') {
        await exportReportPdf({
          title: `Capture GPS — ${selectedType} (${dateFrom} → ${dateTo})`,
          headers,
          rows,
          filename: exportFilename(`capture-${selectedType}`, dateFrom, dateTo, 'pdf'),
        });
        setExportMsg('تم تصدير PDF بنجاح');
      }
    } catch (err) {
      setExportMsg(err?.message ?? 'فشل التصدير');
    }
    setTimeout(() => setExportMsg(null), 3000);
  };

  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">التقارير</h1>
          <p className="text-sm text-capture-metallic mt-1">تحليل بيانات الأسطول والرحلات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportMsg && (
            <span className="text-xs text-capture-success px-3 py-1.5 rounded-lg bg-capture-success/10 border border-capture-success/30 animate-[fade-in_0.2s_ease-out]">
              {exportMsg}
            </span>
          )}
          <Button variant="secondary" size="sm" leftIcon={<FileText className="w-4 h-4" />} onClick={() => handleExport('pdf')}>
            PDF
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4" />} onClick={() => handleExport('excel')}>
            Excel
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExport('csv')}>
            CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={refetch}>إعادة المحاولة</Button>
        </div>
      )}

      {loading && (
        <div className="px-4 py-3 rounded-lg bg-capture-primary/10 border border-capture-primary/20 text-sm text-capture-glow">
          جاري تحميل التقرير من Traccar...
        </div>
      )}

      {/* Report type cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map(({ id, label, icon: Icon, color, iconColor }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setSelectedType(id); setPage(1); }}
            className={cn(
              'capture-card p-4 text-start transition-all duration-300',
              selectedType === id
                ? 'border-capture-primary/40 shadow-glow-sm ring-1 ring-capture-primary/20'
                : 'hover:border-capture-primary/20',
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', color)}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
            <p className="font-semibold text-slate-100 text-sm">{label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5" dir="ltr">
              {selectedType === id ? (
                <>
                  <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                    {formatNumber(reportRows?.length ?? 0, { maximumFractionDigits: 0 })}
                  </span>
                  {' '}سجل
                </>
              ) : '—'}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="capture-card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date presets */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline ms-1" />
              الفترة
            </label>
            <div className="flex flex-wrap gap-1">
              {DATE_PRESETS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    datePreset === id
                      ? 'bg-capture-primary/20 text-capture-glow border border-capture-primary/40'
                      : 'bg-capture-bg/60 text-capture-metallic border border-slate-600/30 hover:border-slate-500/40',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom dates */}
          {datePreset === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">من</label>
                <input
                  type="date"
                  lang="en-US"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className={DATE_INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">إلى</label>
                <input
                  type="date"
                  lang="en-US"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className={DATE_INPUT_CLASS}
                />
              </div>
            </>
          )}

          {datePreset !== 'custom' && (
            <p className="text-xs text-slate-500 pb-2">
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatReportDateKey(dateFrom)}
              </span>
              {' → '}
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatReportDateKey(dateTo)}
              </span>
            </p>
          )}

          <VehicleMultiSelect
            vehicles={vehicles}
            selected={selectedVehiclePlates}
            onChange={(v) => { setSelectedVehiclePlates(v); setPage(1); }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="capture-card p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">اتجاه المسافة اليومية</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="date"
                tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                tickFormatter={(d) => formatReportDateKey(d, { month: 'short', day: 'numeric' })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                tickFormatter={(v) => formatNumber(v, { maximumFractionDigits: 0 })}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.text }} />
              <Line
                type="monotone"
                dataKey="distance"
                name="مسافة (كم)"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.glow, r: 4 }}
                activeDot={{ r: 6, fill: CHART_COLORS.glow }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="capture-card p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">المسافة حسب المركبة</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="vehicle" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                tickFormatter={(v) => formatNumber(v, { maximumFractionDigits: 0 })}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="total"
                name="مسافة (كم)"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="capture-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-600/20 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            نتائج التقرير
            <span className="text-capture-metallic font-normal ms-2">
              (
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(sortedData.length, { maximumFractionDigits: 0 })}
              </span>
              {' '}سجل)
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600/20 bg-capture-bg/40">
                {COLUMNS.map(({ key, label }) => (
                  <th key={key} className="text-start px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="flex items-center gap-1.5 font-semibold text-slate-400 hover:text-capture-glow transition-colors"
                    >
                      {label}
                      <SortIcon column={key} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-16 text-slate-500">
                    لا توجد بيانات للفترة المحددة
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const badge = STATUS_BADGE[row.status] ?? { variant: 'info', label: row.status };
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-600/10 hover:bg-capture-surface/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-200">{row.vehicle}</td>
                      <td className="px-4 py-3 text-slate-400">{row.driver}</td>
                      <td className="px-4 py-3 text-slate-400">{row.type}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatReportDateKey(row.date)}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatDistance(row.distance)}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatDuration(row.duration)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sortedData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-600/20">
            <p className="text-xs text-slate-500">
              صفحة{' '}
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(page, { maximumFractionDigits: 0 })}
              </span>
              {' '}من{' '}
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(totalPages, { maximumFractionDigits: 0 })}
              </span>
            </p>
            <div className={cn('flex items-center gap-1', NUMERIC_DISPLAY_CLASS)} dir="ltr">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-capture-surface/60 text-capture-glow',
                )}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    page === p
                      ? 'bg-capture-primary/20 text-capture-glow border border-capture-primary/40'
                      : 'text-slate-400 hover:bg-capture-surface/60',
                  )}
                >
                  {formatNumber(p, { maximumFractionDigits: 0 })}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  page >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-capture-surface/60 text-capture-glow',
                )}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
