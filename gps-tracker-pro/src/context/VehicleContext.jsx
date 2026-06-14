/**
 * Shared fleet state — Traccar devices/positions + WebSocket updates
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fleetApi } from '../services/traccarApi';
import {
  indexPositions,
  mapDevicesToVehicles,
} from '../services/deviceMapper';
import { VEHICLE_STATUS } from '../utils/constants';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const VehicleContext = createContext(null);

export function VehicleProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { subscribe, isConnected } = useSocket();

  const [devices, setDevices] = useState([]);
  const [positionsByDeviceId, setPositionsByDeviceId] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFleet = useCallback(async () => {
    if (!isAuthenticated) {
      setDevices([]);
      setPositionsByDeviceId({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [devicesResult, positionsResult] = await Promise.allSettled([
        fleetApi.devices(),
        fleetApi.positions(),
      ]);

      if (devicesResult.status === 'fulfilled') {
        setDevices(devicesResult.value ?? []);
      } else {
        throw devicesResult.reason;
      }

      if (positionsResult.status === 'fulfilled') {
        setPositionsByDeviceId(indexPositions(positionsResult.value));
      } else {
        setPositionsByDeviceId({});
        console.warn('[fleet] positions unavailable:', positionsResult.reason?.message);
      }
    } catch (err) {
      setError(err.message || 'تعذّر تحميل المركبات');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    return subscribe((data) => {
      if (data.devices) {
        setDevices(data.devices);
      }
      if (data.positions) {
        setPositionsByDeviceId((prev) => {
          const next = { ...prev };
          data.positions.forEach((position) => {
            next[position.deviceId] = position;
          });
          return next;
        });
      }
    });
  }, [isAuthenticated, subscribe]);

  const allVehicles = useMemo(
    () => mapDevicesToVehicles(devices, positionsByDeviceId),
    [devices, positionsByDeviceId],
  );

  /** Devices with a GPS fix — used for map markers only */
  const positionedVehicles = useMemo(
    () => allVehicles.filter((vehicle) => vehicle.hasPosition),
    [allVehicles],
  );

  const filteredVehicles = filter === 'all'
    ? allVehicles
    : allVehicles.filter((v) => v.status === filter);

  const selectedVehicle = selectedId
    ? allVehicles.find((v) => v.id === selectedId) ?? null
    : null;

  const stats = useMemo(() => ({
    total: allVehicles.length,
    moving: allVehicles.filter((v) => v.status === VEHICLE_STATUS.MOVING).length,
    idle: allVehicles.filter((v) => v.status === VEHICLE_STATUS.IDLE).length,
    online: allVehicles.filter((v) => v.status === VEHICLE_STATUS.ONLINE).length,
    offline: allVehicles.filter((v) => v.status === VEHICLE_STATUS.OFFLINE).length,
    alert: allVehicles.filter((v) => v.status === VEHICLE_STATUS.ALERT).length,
    activeAlerts: allVehicles.reduce((sum, v) => sum + v.alerts.length, 0),
  }), [allVehicles]);

  const selectVehicle = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  const getVehicleById = useCallback(
    (id) => allVehicles.find((v) => v.id === id) ?? null,
    [allVehicles],
  );

  const value = useMemo(
    () => ({
      vehicles: allVehicles,
      positionedVehicles,
      filteredVehicles,
      selectedVehicle,
      selectedId,
      filter,
      stats,
      loading,
      error,
      isSimulating: isConnected,
      isConnected,
      setFilter,
      selectVehicle,
      clearSelection,
      getVehicleById,
      refreshFleet: loadFleet,
    }),
    [
      allVehicles,
      positionedVehicles,
      filteredVehicles,
      selectedVehicle,
      selectedId,
      filter,
      stats,
      loading,
      error,
      isConnected,
      setFilter,
      selectVehicle,
      clearSelection,
      getVehicleById,
      loadFleet,
    ],
  );

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicleContext() {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicleContext must be used within VehicleProvider');
  }
  return context;
}

export default VehicleContext;
