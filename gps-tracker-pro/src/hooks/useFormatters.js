import { useMemo } from 'react';
import { useLocale } from '../context/LocaleContext';
import {
  formatRelativeTime,
  formatRelativeTimeParts,
  formatDate,
  formatTime,
  formatDateTime,
  formatDistance,
  formatDistanceAuto,
  formatSpeed,
  formatDuration,
  formatOdometer,
  formatCoordinates,
  formatNumber,
  formatFuel,
} from '../utils/formatters';

export function useFormatters() {
  const { language } = useLocale();

  return useMemo(
    () => ({
      language,
      formatNumber: (value, options) => formatNumber(value, options),
      formatDate: (iso, options) => formatDate(iso, options, language),
      formatTime: (iso, options) => formatTime(iso, options, language),
      formatDateTime: (iso) => formatDateTime(iso, language),
      formatRelativeTime: (iso) => formatRelativeTime(iso, language),
      formatRelativeTimeParts: (iso) => formatRelativeTimeParts(iso, language),
      formatDistance: (km, decimals) => formatDistance(km, decimals, language),
      formatDistanceAuto: (meters) => formatDistanceAuto(meters, language),
      formatSpeed: (speed, decimals) => formatSpeed(speed, decimals, language),
      formatFuel: (value, decimals) => formatFuel(value, decimals),
      formatDuration: (hours) => formatDuration(hours, language),
      formatOdometer: (km) => formatOdometer(km, language),
      formatCoordinates: (lat, lng, decimals) => formatCoordinates(lat, lng, decimals, language),
    }),
    [language],
  );
}
