import { useMemo } from 'react';
import { VEHICLE_TYPES } from '../utils/constants';
import { useLocale } from '../context/LocaleContext';

export const VEHICLE_FILTER_VALUES = ['all', 'moving', 'idle', 'online', 'offline', 'alert'];

export const VEHICLE_STATUS_KEYS = ['moving', 'idle', 'online', 'offline', 'alert'];

const VEHICLE_TYPE_VALUES = Object.values(VEHICLE_TYPES);

export function useVehicleFilters() {
  const { t, language } = useLocale();
  return useMemo(
    () => VEHICLE_FILTER_VALUES.map((value) => ({
      value,
      label: t(`vehicles.filters.${value}`),
    })),
    [t, language],
  );
}

export function useVehicleStatusLabels() {
  const { t, language } = useLocale();
  return useMemo(
    () => Object.fromEntries(
      VEHICLE_STATUS_KEYS.map((key) => [key, t(`vehicles.status.${key}`)]),
    ),
    [t, language],
  );
}

export function useVehicleTypeLabels() {
  const { t, language } = useLocale();
  return useMemo(
    () => VEHICLE_TYPE_VALUES.map((value) => ({
      value,
      label: t(`vehicles.types.${value}`),
    })),
    [t, language],
  );
}

export function useVehicleStatusLabel(status) {
  const { t } = useLocale();
  const key = `vehicles.status.${status}`;
  const label = t(key);
  return label === key ? status : label;
}
