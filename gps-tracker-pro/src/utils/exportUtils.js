/**
 * Export helpers — Western digits in all numeric cells.
 */

import {
  formatDate,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatFuel,
  formatSpeed,
} from './formatters';

export function exportFilename(prefix, dateFrom, dateTo, ext) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${dateFrom}-to-${dateTo}-${stamp}.${ext}`;
}

export function formatReportRowForExport(row, statusLabel) {
  return {
    vehicle: row.vehicle ?? '',
    driver: row.driver ?? '',
    type: row.type ?? '',
    date: row.date ? formatDate(`${row.date}T00:00:00`, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      numberingSystem: 'latn',
    }) : '—',
    distance: formatDistance(row.distance ?? 0),
    duration: formatDuration(row.duration ?? 0),
    status: statusLabel ?? row.status ?? '',
  };
}

export function formatVehicleRowForExport(vehicle, statusLabel) {
  return [
    vehicle.plate ?? '',
    vehicle.name ?? '',
    vehicle.driver ?? '',
    statusLabel ?? '',
    formatSpeed(vehicle.speed ?? 0),
    formatFuel(vehicle.fuel ?? 0),
  ];
}

export function formatDeviceRowForExport(device) {
  return [
    device.name ?? '',
    device.uniqueId ?? '',
    device.groupName ?? '',
    device.status ?? '',
    device.lastUpdate ? formatDateTime(device.lastUpdate) : '—',
    device.phone ?? '',
    device.model ?? '',
    device.contact ?? '',
  ];
}

export function rowsToCsv(headers, rows) {
  const escape = (cell) => {
    const str = String(cell ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export function downloadBlob(content, mime, filename) {
  const blob = new Blob(['\ufeff', content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
