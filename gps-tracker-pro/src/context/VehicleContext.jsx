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
      const [devicesData, positionsData] = await Promise.all([
        fleetApi.devices(),
        fleetApi.positions(),
      ]);
      setDevices(devicesData ?? []);
      setPositionsByDeviceId(indexPositions(positionsData));
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

  const vehicles = useMemo(
    () => mapDevicesToVehicles(devices, positionsByDeviceId)
      .filter((vehicle) => vehicle.hasPosition),
    [devices, positionsByDeviceId],
  );

  const filteredVehicles = filter === 'all'
    ? vehicles
    : vehicles.filter((v) => v.status === filter);

  const selectedVehicle = selectedId
    ? vehicles.find((v) => v.id === selectedId) ?? null
    : null;

  const stats = useMemo(() => ({
    total: vehicles.length,
    moving: vehicles.filter((v) => v.status === VEHICLE_STATUS.MOVING).length,
    idle: vehicles.filter((v) => v.status === VEHICLE_STATUS.IDLE).length,
    online: vehicles.filter((v) => v.status === VEHICLE_STATUS.ONLINE).length,
    offline: vehicles.filter((v) => v.status === VEHICLE_STATUS.OFFLINE).length,
    alert: vehicles.filter((v) => v.status === VEHICLE_STATUS.ALERT).length,
    activeAlerts: vehicles.reduce((sum, v) => sum + v.alerts.length, 0),
  }), [vehicles]);

  const selectVehicle = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  const getVehicleById = useCallback(
    (id) => vehicles.find((v) => v.id === id) ?? null,
    [vehicles],
  );

  const value = useMemo(
    () => ({
      vehicles,
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
      vehicles,
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
