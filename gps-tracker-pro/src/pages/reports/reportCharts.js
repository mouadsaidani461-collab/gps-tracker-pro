/** Chart data builders — keyed by report type (distance / count / duration). */

function sortByDate(rows) {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

function sortByTotalDesc(rows) {
  return [...rows].sort((a, b) => b.total - a.total);
}

export function buildDistanceTrendData(rows) {
  const byDate = {};
  rows.forEach((row) => {
    if (!byDate[row.date]) byDate[row.date] = { date: row.date, distance: 0 };
    byDate[row.date].distance += row.distance ?? 0;
  });
  return sortByDate(Object.values(byDate));
}

export function buildDistanceByVehicleData(rows) {
  const byVehicle = {};
  rows.forEach((row) => {
    if (!byVehicle[row.vehicle]) byVehicle[row.vehicle] = { vehicle: row.vehicle, total: 0 };
    byVehicle[row.vehicle].total += row.distance ?? 0;
  });
  return sortByTotalDesc(Object.values(byVehicle));
}

export function buildCountTrendData(rows) {
  const byDate = {};
  rows.forEach((row) => {
    if (!byDate[row.date]) byDate[row.date] = { date: row.date, count: 0 };
    byDate[row.date].count += 1;
  });
  return sortByDate(Object.values(byDate));
}

export function buildCountByVehicleData(rows) {
  const byVehicle = {};
  rows.forEach((row) => {
    if (!byVehicle[row.vehicle]) byVehicle[row.vehicle] = { vehicle: row.vehicle, total: 0 };
    byVehicle[row.vehicle].total += 1;
  });
  return sortByTotalDesc(Object.values(byVehicle));
}

export function buildDurationTrendData(rows) {
  const byDate = {};
  rows.forEach((row) => {
    if (!byDate[row.date]) byDate[row.date] = { date: row.date, duration: 0 };
    byDate[row.date].duration += row.duration ?? 0;
  });
  return sortByDate(Object.values(byDate));
}

export function buildDurationByVehicleData(rows) {
  const byVehicle = {};
  rows.forEach((row) => {
    if (!byVehicle[row.vehicle]) byVehicle[row.vehicle] = { vehicle: row.vehicle, total: 0 };
    byVehicle[row.vehicle].total += row.duration ?? 0;
  });
  return sortByTotalDesc(Object.values(byVehicle));
}

/** Chart layout + builders for the active report type. */
export function getChartConfig(reportType) {
  switch (reportType) {
    case 'trips':
    case 'speed':
    case 'vehicles':
      return {
        buildTrend: buildDistanceTrendData,
        buildBar: buildDistanceByVehicleData,
        trendKey: 'distance',
        barKey: 'total',
        trendTitleKey: 'reports.dailyTrend',
        barTitleKey: 'reports.distanceByVehicle',
        seriesLabelKey: 'reports.distanceKm',
        formatTrend: 'distance',
        formatBar: 'distance',
      };
    case 'alerts':
      return {
        buildTrend: buildCountTrendData,
        buildBar: buildCountByVehicleData,
        trendKey: 'count',
        barKey: 'total',
        trendTitleKey: 'reports.dailyAlertTrend',
        barTitleKey: 'reports.alertsByVehicle',
        seriesLabelKey: 'reports.alertCount',
        formatTrend: 'integer',
        formatBar: 'integer',
      };
    case 'stops':
      return {
        buildTrend: buildDurationTrendData,
        buildBar: buildDurationByVehicleData,
        trendKey: 'duration',
        barKey: 'total',
        trendTitleKey: 'reports.dailyStopDuration',
        barTitleKey: 'reports.stopDurationByVehicle',
        seriesLabelKey: 'reports.durationHours',
        formatTrend: 'duration',
        formatBar: 'duration',
      };
    default:
      return null;
  }
}

export function hasChartValues(data, key) {
  return data.some((row) => (row[key] ?? 0) > 0);
}

export function getVisiblePageNumbers(page, totalPages, maxButtons = 7) {
  if (totalPages <= 0) return [];
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
