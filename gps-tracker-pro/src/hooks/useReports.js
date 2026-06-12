import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { reportApi } from '../services/traccarApi';
import {
  buildDevicesLookup,
  mapEventsToRows,
  mapSpeedRows,
  mapStopsToRows,
  mapSummaryToRows,
  mapTripsToRows,
  toIsoRange,
} from '../services/reportMapper';

export function useReports({
  reportType, dateFrom, dateTo, deviceIds, deviceIdsKey, vehicles, enabled = true,
}) {
  const { language, t } = useLocale();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fleetKey = useMemo(
    () => (vehicles ?? [])
      .map((v) => `${v.deviceId ?? v.id}:${v.plate ?? ''}`)
      .sort()
      .join('|'),
    [vehicles],
  );

  const fetchReports = useCallback(async () => {
    if (!enabled || !dateFrom || !dateTo) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { from, to } = toIsoRange(dateFrom, dateTo);
      const query = { from, to, deviceIds: deviceIds ?? [] };
      const devicesById = buildDevicesLookup(vehicles);

      let data = [];
      if (reportType === 'trips') {
        data = mapTripsToRows(await reportApi.trips(query), devicesById, language);
      } else if (reportType === 'speed') {
        const trips = await reportApi.trips(query);
        data = mapSpeedRows(trips, devicesById, 90, language);
      } else if (reportType === 'alerts') {
        data = mapEventsToRows(await reportApi.events(query), devicesById, language);
      } else if (reportType === 'vehicles') {
        data = mapSummaryToRows(await reportApi.summary(query), devicesById, language);
      } else if (reportType === 'stops') {
        data = mapStopsToRows(await reportApi.stops(query), devicesById, language);
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || t('reports.loadingReport'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo, deviceIdsKey, fleetKey, enabled, vehicles, deviceIds, language, t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { rows, loading, error, refetch: fetchReports };
}
