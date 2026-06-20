import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, RefreshCw, Download, Trash2, Pencil,
  HardDrive, CheckSquare, Square, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useDevices } from '../hooks/useDevices';
import { useLocale } from '../context/LocaleContext';
import { useFormatters } from '../hooks/useFormatters';
import {
  formatNumber, NUMERIC_DISPLAY_CLASS,
} from '../utils/formatters';
import { getVisiblePageNumbers } from '../utils/pagination';
import {
  formatDeviceRowForExport, rowsToCsv, downloadBlob, exportFilename,
} from '../utils/exportUtils';
import Button from '../components/ui/Button';
import { SkeletonTable } from '../components/ui/Skeleton';
import DeviceFormModal from '../components/devices/DeviceFormModal';
import DeviceDeleteConfirm from '../components/devices/DeviceDeleteConfirm';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const PAGE_SIZES = [10, 25, 50];
const PAGE_BUTTON_WINDOW = 7;

const COLUMN_KEYS = ['name', 'uniqueId', 'groupName', 'status', 'lastUpdate'];

function DeviceEmptyState({ isFilteredEmpty, onCreate }) {
  const { t } = useLocale();

  return (
    <div className="capture-card p-8 md:p-16 text-center">
      <HardDrive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">
        {isFilteredEmpty ? t('devices.searchEmpty') : t('devices.empty')}
      </p>
      {!isFilteredEmpty && (
        <p className="text-sm text-slate-500 mt-1 mb-4">{t('devices.emptyHint')}</p>
      )}
      {!isFilteredEmpty && (
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={onCreate}>
          {t('devices.addFirst')}
        </Button>
      )}
    </div>
  );
}

function DevicePaginationBar({
  page,
  totalPages,
  pageSize,
  visiblePages,
  onPageChange,
  onPageSizeChange,
  t,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-600/20">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{t('devices.show')}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 rounded bg-capture-bg/60 border border-slate-600/30 text-slate-200"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {formatNumber(size, { maximumFractionDigits: 0 })}
            </option>
          ))}
        </select>
        <span>
          {t('devices.pageOf', {
            page: formatNumber(page, { maximumFractionDigits: 0 }),
            total: formatNumber(totalPages, { maximumFractionDigits: 0 }),
          })}
        </span>
      </div>
      <div className={cn('flex items-center gap-1', NUMERIC_DISPLAY_CLASS)} dir="ltr">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-capture-surface/60 text-capture-glow',
          )}
          aria-label={t('common.previousPage')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {visiblePages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
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
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            page >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-capture-surface/60 text-capture-glow',
          )}
          aria-label={t('common.nextPage')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const { dir, t } = useLocale();
  const { formatDateTime } = useFormatters();
  const columns = useMemo(
    () => COLUMN_KEYS.map((key) => ({ key, label: t(`devices.columns.${key}`) })),
    [t],
  );
  const {
    devices,
    filteredDevices,
    groups,
    loading,
    error,
    search,
    statusFilter,
    groupFilter,
    selectedIds,
    setSearch,
    setStatusFilter,
    setGroupFilter,
    toggleSelected,
    clearSelected,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    bulkDelete,
  } = useDevices();

  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formSubmitError, setFormSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkMsg, setBulkMsg] = useState(null);

  const sortedDevices = useMemo(() => {
    const rows = [...filteredDevices];
    rows.sort((a, b) => {
      let av = a[sortKey] ?? '';
      let bv = b[sortKey] ?? '';
      if (sortKey === 'lastUpdate') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredDevices, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedDevices.length / pageSize));
  const paginatedDevices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedDevices.slice(start, start + pageSize);
  }, [sortedDevices, page, pageSize]);

  const visiblePages = useMemo(
    () => getVisiblePageNumbers(page, totalPages, PAGE_BUTTON_WINDOW),
    [page, totalPages],
  );

  const isDbEmpty = !loading && devices.length === 0;
  const isFilteredEmpty = !loading && devices.length > 0 && filteredDevices.length === 0;
  const listEmpty = isDbEmpty || isFilteredEmpty;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
  }), [devices]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
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

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedDevices.length && paginatedDevices.every((d) => selectedIds.has(d.id))) {
      clearSelected();
    } else {
      paginatedDevices.forEach((d) => {
        if (!selectedIds.has(d.id)) toggleSelected(d.id);
      });
    }
  };

  const openCreate = () => {
    setEditingDevice(null);
    setFormSubmitError('');
    setFormOpen(true);
  };

  const openEdit = (device) => {
    setEditingDevice(device);
    setFormSubmitError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    setSaving(true);
    setFormSubmitError('');
    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, payload);
      } else {
        await createDevice(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormSubmitError(err.message || t('devices.form.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (device) => {
    setDeleteTarget({ type: 'single', device });
    setDeleteOpen(true);
  };

  const openBulkDelete = () => {
    setDeleteTarget({ type: 'bulk', ids: [...selectedIds] });
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      if (deleteTarget?.type === 'bulk') {
        await bulkDelete(deleteTarget.ids);
      } else if (deleteTarget?.device) {
        await deleteDevice(deleteTarget.device.id);
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkExport = useCallback(() => {
    const selected = devices.filter((d) => selectedIds.has(d.id));
    const headers = [
      t('devices.exportHeaders.name'),
      t('devices.exportHeaders.imei'),
      t('devices.exportHeaders.group'),
      t('devices.exportHeaders.status'),
      t('devices.exportHeaders.lastUpdate'),
      t('devices.exportHeaders.phone'),
      t('devices.exportHeaders.model'),
      t('devices.exportHeaders.contact'),
    ];
    const rows = selected.map(formatDeviceRowForExport);
    downloadBlob(
      rowsToCsv(headers, rows),
      'text/csv;charset=utf-8;',
      exportFilename('devices', new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10), 'csv'),
    );
    setBulkMsg(t('devices.exportedCount', { count: formatNumber(selected.length, { maximumFractionDigits: 0 }) }));
    setTimeout(() => setBulkMsg(null), 2500);
  }, [devices, selectedIds, t]);

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const allPageSelected = paginatedDevices.length > 0
    && paginatedDevices.every((d) => selectedIds.has(d.id));

  const selectedLabel = t('devices.devicesSelected', {
    count: formatNumber(selectedIds.size, { maximumFractionDigits: 0 }),
  });

  return (
    <div dir={dir} className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t('devices.pageTitle')}</h1>
          <p className="text-sm text-capture-metallic mt-1">
            {t('devices.pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchDevices} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            {t('devices.addDevice')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { labelKey: 'devices.stats.total', value: stats.total, color: 'text-slate-100' },
          { labelKey: 'devices.stats.online', value: stats.online, color: 'text-capture-glow' },
          { labelKey: 'devices.stats.offline', value: stats.offline, color: 'text-capture-danger' },
        ].map(({ labelKey, value, color }) => (
          <div key={labelKey} className="capture-card p-4">
            <p className="text-[10px] text-capture-metallic">{t(labelKey)}</p>
            <p className={cn('text-2xl font-bold', color)}>
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                {formatNumber(value, { maximumFractionDigits: 0 })}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="capture-card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('devices.searchPlaceholder')}
              className="w-full ps-10 pe-4 py-2.5 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 focus:outline-none focus:border-capture-primary/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200"
          >
            <option value="all">{t('devices.allStatuses')}</option>
            <option value="online">{t('devices.status.online')}</option>
            <option value="offline">{t('devices.status.offline')}</option>
            <option value="unknown">{t('devices.status.unknown')}</option>
          </select>
          <select
            value={groupFilter}
            onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200"
          >
            <option value="all">{t('devices.allGroups')}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchDevices}>{t('common.retry')}</Button>
        </div>
      )}

      {bulkMsg && (
        <div className="px-4 py-3 rounded-lg bg-capture-success/10 border border-capture-success/30 text-sm text-capture-success">
          {bulkMsg}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 capture-card p-3 flex flex-wrap items-center justify-between gap-3 border border-capture-primary/30 shadow-glow-sm">
          <p className="text-sm text-slate-200">{selectedLabel}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleBulkExport}>
              {t('devices.exportCsv')}
            </Button>
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={openBulkDelete}>
              {t('devices.deleteSelected')}
            </Button>
            <button type="button" onClick={clearSelected} className="p-2 text-slate-400 hover:text-slate-200" aria-label={t('devices.clearSelection')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block capture-card overflow-hidden border border-slate-600/25">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-capture-surface/60 border-b border-slate-600/25">
                <th className="px-3 py-3 w-10">
                  <button type="button" onClick={toggleSelectAll} aria-label={t('common.selectAll')}>
                    {allPageSelected
                      ? <CheckSquare className="w-4 h-4 text-capture-glow" />
                      : <Square className="w-4 h-4 text-slate-500" />}
                  </button>
                </th>
                {columns.map(({ key, label }) => (
                  <th key={key} className="text-start px-4 py-3 font-semibold text-slate-300">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-capture-glow" onClick={() => handleSort(key)}>
                      {label}
                      <SortIcon column={key} />
                    </button>
                  </th>
                ))}
                <th className="text-start px-4 py-3 font-semibold text-slate-300">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <SkeletonTable rows={5} cols={6} />
                  </td>
                </tr>
              ) : listEmpty ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <DeviceEmptyState isFilteredEmpty={isFilteredEmpty} onCreate={openCreate} />
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((device) => (
                  <tr key={device.id} className="border-b border-slate-600/15 hover:bg-capture-card/40">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSelected(device.id)}
                        aria-label={device.name}
                      >
                        {selectedIds.has(device.id)
                          ? <CheckSquare className="w-4 h-4 text-capture-glow" />
                          : <Square className="w-4 h-4 text-slate-500" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">{device.name}</td>
                    <td className="px-4 py-3">
                      <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{device.uniqueId}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{device.groupName}</td>
                    <td className="px-4 py-3">
                      <DeviceStatusBadge status={device.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                        {device.lastUpdate ? formatDateTime(device.lastUpdate) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(device)}
                          className="p-2 rounded-lg text-slate-400 hover:text-capture-glow hover:bg-capture-primary/10"
                          title={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(device)}
                          className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && sortedDevices.length > 0 && (
          <DevicePaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            visiblePages={visiblePages}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            t={t}
          />
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <SkeletonTable rows={4} cols={1} />
        ) : listEmpty ? (
          <DeviceEmptyState isFilteredEmpty={isFilteredEmpty} onCreate={openCreate} />
        ) : (
          <>
            {paginatedDevices.map((device) => (
              <div key={device.id} className="capture-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelected(device.id)}
                      aria-label={device.name}
                    >
                      {selectedIds.has(device.id)
                        ? <CheckSquare className="w-4 h-4 text-capture-glow mt-1" />
                        : <Square className="w-4 h-4 text-slate-500 mt-1" />}
                    </button>
                    <div>
                      <p className="font-semibold text-slate-100">{device.name}</p>
                      <p className={cn('text-xs text-slate-500 mt-0.5', NUMERIC_DISPLAY_CLASS)} dir="ltr">
                        {device.uniqueId}
                      </p>
                    </div>
                  </div>
                  <DeviceStatusBadge status={device.status} />
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>{t('devices.groupLabel')}: {device.groupName}</p>
                  <p>
                    {t('devices.lastUpdateLabel')}:{' '}
                    <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
                      {device.lastUpdate ? formatDateTime(device.lastUpdate) : '—'}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(device)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => openDelete(device)}>
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))}
            <div className="capture-card overflow-hidden border border-slate-600/25">
              <DevicePaginationBar
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                visiblePages={visiblePages}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                t={t}
              />
            </div>
          </>
        )}
      </div>

      <DeviceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        device={editingDevice}
        groups={groups}
        existingDevices={devices}
        onSubmit={handleFormSubmit}
        saving={saving}
        submitError={formSubmitError}
      />

      <DeviceDeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        count={deleteTarget?.type === 'bulk' ? deleteTarget.ids.length : 1}
        deviceName={deleteTarget?.device?.name}
        onConfirm={handleConfirmDelete}
        loading={saving}
      />
    </div>
  );
}
