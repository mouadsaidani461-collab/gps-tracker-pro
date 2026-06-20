/**
 * Device admin state — Traccar device CRUD + groups
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { deviceApi, groupApi } from '../services/traccarApi';
import { useAuth } from './AuthContext';
import { useLocale } from './LocaleContext';
import { useSocket } from './SocketContext';
import { useNotificationContext } from './NotificationContext';

const DeviceContext = createContext(null);

function indexGroups(groups) {
  const map = {};
  (groups ?? []).forEach((group) => {
    map[group.id] = group;
  });
  return map;
}

export function mapDeviceRow(device, groupsById = {}) {
  return {
    id: device.id,
    name: device.name ?? '',
    uniqueId: device.uniqueId ?? '',
    status: device.status ?? 'unknown',
    lastUpdate: device.lastUpdate ?? null,
    groupId: device.groupId ?? null,
    groupName: device.groupId != null ? (groupsById[device.groupId]?.name ?? '—') : '—',
    phone: device.phone ?? '',
    model: device.model ?? '',
    contact: device.contact ?? '',
    raw: device,
  };
}

export function DeviceProvider({ children }) {
  const { isAuthenticated, can } = useAuth();
  const { t } = useLocale();
  const { subscribe } = useSocket();
  const { pushNotification } = useNotificationContext();

  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const groupsById = useMemo(() => indexGroups(groups), [groups]);

  const notify = useCallback((type, title, message) => {
    pushNotification?.({ type, title, message });
  }, [pushNotification]);

  const fetchDevices = useCallback(async () => {
    if (!isAuthenticated || !can('vehicles:write')) {
      setDevices([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [devicesData, groupsData] = await Promise.all([
        deviceApi.list(),
        groupApi.list(),
      ]);
      setGroups(groupsData ?? []);
      const byGroup = indexGroups(groupsData);
      setDevices((devicesData ?? []).map((d) => mapDeviceRow(d, byGroup)));
    } catch (err) {
      setError(err.message || t('devices.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, can, t]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (!isAuthenticated || !can('vehicles:write')) return undefined;

    return subscribe((data) => {
      if (!data.devices?.length) return;
      setDevices((prev) => {
        const byId = Object.fromEntries(prev.map((d) => [d.id, d]));
        data.devices.forEach((device) => {
          byId[device.id] = mapDeviceRow(device, groupsById);
        });
        return Object.values(byId);
      });
    });
  }, [isAuthenticated, can, subscribe, groupsById]);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (statusFilter !== 'all' && device.status !== statusFilter) return false;
      if (groupFilter !== 'all' && String(device.groupId) !== String(groupFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          device.name.toLowerCase().includes(q)
          || device.uniqueId.toLowerCase().includes(q)
          || device.phone.toLowerCase().includes(q)
          || device.contact.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [devices, search, statusFilter, groupFilter]);

  const setSelected = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const createDevice = useCallback(async (payload) => {
    try {
      const created = await deviceApi.create(payload);
      await fetchDevices();
      notify('success', t('devices.toast.added'), created?.name ?? payload.name);
      return created;
    } catch (err) {
      notify('alert', t('devices.toast.saveFailed'), err.message || t('devices.toast.saveFailed'));
      throw err;
    }
  }, [fetchDevices, notify, t]);

  const updateDevice = useCallback(async (id, payload) => {
    try {
      const updated = await deviceApi.update(id, payload);
      await fetchDevices();
      notify('success', t('devices.toast.updated'), updated?.name ?? payload.name);
      return updated;
    } catch (err) {
      notify('alert', t('devices.toast.saveFailed'), err.message || t('devices.toast.saveFailed'));
      throw err;
    }
  }, [fetchDevices, notify, t]);

  const deleteDevice = useCallback(async (id) => {
    const snapshot = devices;
    setDevices((prev) => prev.filter((d) => String(d.id) !== String(id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await deviceApi.remove(id);
      notify('success', t('devices.toast.deleted'), t('devices.toast.deletedDetail'));
    } catch (err) {
      setDevices(snapshot);
      notify('alert', t('devices.toast.deleteFailed'), err.message || t('devices.toast.deleteFailed'));
      throw err;
    }
  }, [devices, notify, t]);

  const bulkDelete = useCallback(async (ids) => {
    const idList = [...ids].map(String);
    const snapshot = devices;
    setDevices((prev) => prev.filter((d) => !idList.includes(String(d.id))));
    clearSelected();
    try {
      await deviceApi.bulkRemove(ids);
      notify('success', t('devices.toast.bulkDeleted'), t('devices.toast.bulkDeletedDetail', { count: idList.length }));
    } catch (err) {
      setDevices(snapshot);
      notify('alert', t('devices.toast.bulkDeleteFailed'), err.message || t('devices.toast.bulkDeleteFailed'));
      await fetchDevices();
      throw err;
    }
  }, [devices, clearSelected, notify, fetchDevices, t]);

  const value = useMemo(
    () => ({
      devices,
      filteredDevices,
      groups,
      groupsById,
      loading,
      error,
      search,
      statusFilter,
      groupFilter,
      selectedIds,
      setSearch,
      setStatusFilter,
      setGroupFilter,
      setSelected,
      toggleSelected,
      clearSelected,
      fetchDevices,
      createDevice,
      updateDevice,
      deleteDevice,
      bulkDelete,
    }),
    [
      devices,
      filteredDevices,
      groups,
      groupsById,
      loading,
      error,
      search,
      statusFilter,
      groupFilter,
      selectedIds,
      setSelected,
      toggleSelected,
      clearSelected,
      fetchDevices,
      createDevice,
      updateDevice,
      deleteDevice,
      bulkDelete,
    ],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDeviceContext() {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDeviceContext must be used within DeviceProvider');
  }
  return context;
}

export default DeviceContext;
