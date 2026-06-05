import { useCallback, useEffect, useState } from 'react';
import { reportApi } from '../services/traccarApi';
import {
  buildDevicesLookup,
  mapEventsToRows,
  mapSpeedRows,
  mapSummaryToRows,
  mapTripsToRows,
  toIsoRange,
} from '../services/reportMapper';

export function useReports({ reportType, dateFrom, dateTo, deviceIds, vehicles, enabled = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        data = mapTripsToRows(await reportApi.trips(query), devicesById);
      } else if (reportType === 'speed') {
        const trips = await reportApi.trips(query);
        data = mapSpeedRows(trips, devicesById);
      } else if (reportType === 'alerts') {
        data = mapEventsToRows(await reportApi.events(query), devicesById);
      } else if (reportType === 'vehicles') {
        data = mapSummaryToRows(await reportApi.summary(query), devicesById);
      }

      setRows(data);
    } catch (err) {
      setError(err.message || 'تعذّر تحميل التقرير');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo, deviceIds, vehicles, enabled]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { rows, loading, error, refetch: fetchReports };
}
