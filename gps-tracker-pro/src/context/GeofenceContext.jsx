/**
 * Shared geofence state — Traccar API CRUD, synced across Dashboard + Map
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { geofenceApi, permissionsApi } from '../services/traccarApi';
import {
  GEOFENCE_COLORS,
  GEOFENCE_DEFAULTS,
  GEOFENCE_TYPES,
  MOROCCO_CITY_PRESETS,
} from '../utils/constants';
import {
  appGeofenceToTraccar,
  normalizeGeofence,
  sameGeofenceId,
  traccarGeofencesToApp,
} from '../utils/geofenceUtils';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const GeofenceContext = createContext(null);
const UPDATE_DEBOUNCE_MS = 600;

function createLocalGeofence(partial, index) {
  const color = partial.color ?? GEOFENCE_COLORS[index % GEOFENCE_COLORS.length];

  if (partial.type === GEOFENCE_TYPES.POLYGON) {
    const coordinates = partial.coordinates ?? [];
    return normalizeGeofence({
      name: partial.name ?? `مضلع ${index + 1}`,
      type: GEOFENCE_TYPES.POLYGON,
      coordinates,
      color,
    });
  }

  return normalizeGeofence({
    name: partial.name ?? `منطقة ${index + 1}`,
    type: GEOFENCE_TYPES.CIRCLE,
    center: partial.center,
    radius: partial.radius ?? GEOFENCE_DEFAULTS.radius,
    color,
  });
}

export function GeofenceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { isConnected, subscribe } = useSocket();
  const [geofences, setGeofences] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [drawMode, setDrawMode] = useState(null);
  const [polygonDraft, setPolygonDraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [linkedDeviceIds, setLinkedDeviceIds] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const geofencesRef = useRef(geofences);
  const pendingUpdatesRef = useRef(new Map());

  useEffect(() => {
    geofencesRef.current = geofences;
  }, [geofences]);

  const selectedGeofence = geofences.find((g) => sameGeofenceId(g.id, selectedId)) ?? null;

  const clearDrawState = useCallback(() => {
    setDrawMode(null);
    setPolygonDraft([]);
  }, []);

  const refreshGeofences = useCallback(async () => {
    if (!isAuthenticated) {
      setGeofences([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await geofenceApi.list();
      setGeofences(traccarGeofencesToApp(data));
    } catch (err) {
      setError(err.message || 'تعذّر تحميل المناطق الجغرافية');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshGeofences();
  }, [refreshGeofences]);

  // Refresh from Traccar when WebSocket (re)connects — keeps Dashboard + Map in sync
  useEffect(() => {
    if (!isAuthenticated || !isConnected) return undefined;

    refreshGeofences();

    return subscribe((data) => {
      if (data.devices || data.positions) return;
      if (data.events?.some((e) => e.type === 'geofenceEnter' || e.type === 'geofenceExit')) {
        refreshGeofences();
      }
    });
  }, [isAuthenticated, isConnected, refreshGeofences, subscribe]);

  useEffect(() => {
    if (!selectedId || !isAuthenticated) {
      setLinkedDeviceIds([]);
      return;
    }

    let cancelled = false;
    setLinksLoading(true);

    permissionsApi.list({ geofenceId: selectedId })
      .then((links) => {
        if (!cancelled) {
          setLinkedDeviceIds((links ?? []).map((l) => l.deviceId));
        }
      })
      .catch(() => {
        if (!cancelled) setLinkedDeviceIds([]);
      })
      .finally(() => {
        if (!cancelled) setLinksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, isAuthenticated]);

  useEffect(() => () => {
    pendingUpdatesRef.current.forEach((timer) => clearTimeout(timer));
    pendingUpdatesRef.current.clear();
  }, []);

  const selectGeofence = useCallback((id) => {
    setSelectedId(id);
    clearDrawState();
  }, [clearDrawState]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    clearDrawState();
  }, [clearDrawState]);

  const persistGeofence = useCallback(async (id) => {
    const current = geofencesRef.current.find((g) => sameGeofenceId(g.id, id));
    if (!current) return;

    setSaving(true);
    setError(null);
    try {
      const payload = appGeofenceToTraccar(current);
      const saved = await geofenceApi.update(id, payload);
      const normalized = traccarGeofencesToApp([saved])[0];
      if (normalized) {
        setGeofences((prev) => prev.map((g) => (sameGeofenceId(g.id, id) ? normalized : g)));
      }
    } catch (err) {
      setError(err.message || 'تعذّر حفظ المنطقة');
      await refreshGeofences();
    } finally {
      setSaving(false);
    }
  }, [refreshGeofences]);

  const schedulePersist = useCallback((id) => {
    const existing = pendingUpdatesRef.current.get(id);
    if (existing) clearTimeout(existing);

    pendingUpdatesRef.current.set(
      id,
      setTimeout(() => {
        pendingUpdatesRef.current.delete(id);
        persistGeofence(id);
      }, UPDATE_DEBOUNCE_MS),
    );
  }, [persistGeofence]);

  const addGeofence = useCallback(async (partial) => {
    const draft = createLocalGeofence(partial, geofencesRef.current.length);
    setSaving(true);
    setError(null);

    try {
      const payload = appGeofenceToTraccar(draft);
      delete payload.id;
      const created = await geofenceApi.create(payload);
      const appGeofence = traccarGeofencesToApp([created])[0];
      if (!appGeofence) throw new Error('استجابة غير صالحة من الخادم');

      setGeofences((prev) => [...prev, appGeofence]);
      setSelectedId(appGeofence.id);
      clearDrawState();
      return appGeofence;
    } catch (err) {
      setError(err.message || 'تعذّر إنشاء المنطقة');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [clearDrawState]);

  const updateGeofence = useCallback((id, patch) => {
    setGeofences((prev) => prev.map((g) => {
      if (!sameGeofenceId(g.id, id)) return g;
      return normalizeGeofence({ ...g, ...patch });
    }));
    schedulePersist(id);
  }, [schedulePersist]);

  const deleteGeofence = useCallback(async (id) => {
    setSaving(true);
    setError(null);
    try {
      await geofenceApi.remove(id);
      setGeofences((prev) => prev.filter((g) => !sameGeofenceId(g.id, id)));
      setSelectedId((current) => (sameGeofenceId(current, id) ? null : current));
      clearDrawState();
    } catch (err) {
      setError(err.message || 'تعذّر حذف المنطقة');
    } finally {
      setSaving(false);
    }
  }, [clearDrawState]);

  const startCreateCircleMode = useCallback(() => {
    setDrawMode('create-circle');
    setSelectedId(null);
    setPolygonDraft([]);
  }, []);

  const startCreatePolygonMode = useCallback(() => {
    setDrawMode('create-polygon');
    setSelectedId(null);
    setPolygonDraft([]);
  }, []);

  const startRepositionMode = useCallback(() => {
    if (!selectedId) return;
    const gf = geofencesRef.current.find((g) => sameGeofenceId(g.id, selectedId));
    if (gf?.type === GEOFENCE_TYPES.POLYGON) return;
    setDrawMode('reposition');
    setPolygonDraft([]);
  }, [selectedId]);

  const cancelDrawMode = clearDrawState;

  const undoPolygonPoint = useCallback(() => {
    setPolygonDraft((prev) => prev.slice(0, -1));
  }, []);

  const finishPolygon = useCallback(async () => {
    if (polygonDraft.length < GEOFENCE_DEFAULTS.minPolygonPoints) return null;
    return addGeofence({
      type: GEOFENCE_TYPES.POLYGON,
      coordinates: [...polygonDraft],
      name: `مضلع ${geofencesRef.current.length + 1}`,
    });
  }, [polygonDraft, addGeofence]);

  const handleMapClick = useCallback(async (point) => {
    if (drawMode === 'create-circle') {
      await addGeofence({
        type: GEOFENCE_TYPES.CIRCLE,
        center: point,
        name: `منطقة جديدة ${geofencesRef.current.length + 1}`,
      });
      return;
    }

    if (drawMode === 'create-polygon') {
      setPolygonDraft((prev) => [...prev, point]);
      return;
    }

    if (drawMode === 'reposition' && selectedId) {
      updateGeofence(selectedId, { center: point });
      clearDrawState();
    }
  }, [drawMode, selectedId, addGeofence, updateGeofence, clearDrawState]);

  const addPresetGeofence = useCallback(async ({ name, center }) => {
    const existing = geofencesRef.current.find(
      (g) => g.type === GEOFENCE_TYPES.CIRCLE
        && Math.abs(g.center[0] - center[0]) < 0.01
        && Math.abs(g.center[1] - center[1]) < 0.01,
    );
    if (existing) {
      setSelectedId(existing.id);
      return existing;
    }
    return addGeofence({
      type: GEOFENCE_TYPES.CIRCLE,
      name,
      center,
      radius: GEOFENCE_DEFAULTS.radius,
    });
  }, [addGeofence]);

  const toggleDeviceLink = useCallback(async (deviceId) => {
    if (!selectedId) return;

    const linked = linkedDeviceIds.includes(deviceId);
    setLinksLoading(true);
    setError(null);

    try {
      if (linked) {
        await permissionsApi.unlink({ deviceId, geofenceId: selectedId });
        setLinkedDeviceIds((prev) => prev.filter((id) => id !== deviceId));
      } else {
        await permissionsApi.link({ deviceId, geofenceId: selectedId });
        setLinkedDeviceIds((prev) => [...prev, deviceId]);
      }
    } catch (err) {
      setError(err.message || 'تعذّر تحديث ربط الجهاز');
    } finally {
      setLinksLoading(false);
    }
  }, [selectedId, linkedDeviceIds]);

  const value = useMemo(
    () => ({
      geofences,
      selectedId,
      selectedGeofence,
      drawMode,
      polygonDraft,
      loading,
      saving,
      error,
      linkedDeviceIds,
      linksLoading,
      toggleDeviceLink,
      selectGeofence,
      clearSelection,
      addGeofence,
      updateGeofence,
      deleteGeofence,
      refreshGeofences,
      startCreateMode: startCreateCircleMode,
      startCreateCircleMode,
      startCreatePolygonMode,
      startRepositionMode,
      cancelDrawMode,
      undoPolygonPoint,
      finishPolygon,
      handleMapClick,
      addPresetGeofence,
      isDrawing: drawMode !== null,
      cityPresets: MOROCCO_CITY_PRESETS,
    }),
    [
      geofences,
      selectedId,
      selectedGeofence,
      drawMode,
      polygonDraft,
      loading,
      saving,
      error,
      linkedDeviceIds,
      linksLoading,
      toggleDeviceLink,
      selectGeofence,
      clearSelection,
      addGeofence,
      updateGeofence,
      deleteGeofence,
      refreshGeofences,
      startCreateCircleMode,
      startCreatePolygonMode,
      startRepositionMode,
      cancelDrawMode,
      undoPolygonPoint,
      finishPolygon,
      handleMapClick,
      addPresetGeofence,
    ],
  );

  return <GeofenceContext.Provider value={value}>{children}</GeofenceContext.Provider>;
}

export function useGeofenceContext() {
  const context = useContext(GeofenceContext);
  if (!context) {
    throw new Error('useGeofenceContext must be used within GeofenceProvider');
  }
  return context;
}

export default GeofenceContext;
