import { fetchApi } from './api';

export const sessionApi = {
  get: () => fetchApi('/session').catch((err) => {
    if (err?.status === 404 || err?.status === 401) return null;
    throw err;
  }),
  login: (email, password, code) => {
    const body = new URLSearchParams();
    body.set('email', email.trim());
    body.set('password', password);
    if (code?.trim()) body.set('code', code.trim());
    return fetchApi('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },
  logout: () => fetchApi('/session', { method: 'DELETE' }),
};

export const geofenceApi = {
  list: () => fetchApi('/geofences'),
  create: (payload) => fetchApi('/geofences', { method: 'POST', body: payload }),
  update: (id, payload) => fetchApi(`/geofences/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => fetchApi(`/geofences/${id}`, { method: 'DELETE' }),
};

export const fleetApi = {
  devices: () => fetchApi('/devices'),
  positions: () => fetchApi('/positions'),
};

export const deviceApi = {
  list: () => fetchApi('/devices'),
  get: (id) => fetchApi(`/devices/${id}`),
  create: (payload) => fetchApi('/devices', { method: 'POST', body: payload }),
  update: (id, payload) => fetchApi(`/devices/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => fetchApi(`/devices/${id}`, { method: 'DELETE' }),
  bulkRemove: (ids) => Promise.all(
    (ids ?? []).map((id) => fetchApi(`/devices/${id}`, { method: 'DELETE' })),
  ),
};

export const groupApi = {
  list: () => fetchApi('/groups'),
  get: (id) => fetchApi(`/groups/${id}`),
  create: (payload) => fetchApi('/groups', { method: 'POST', body: payload }),
  update: (id, payload) => fetchApi(`/groups/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => fetchApi(`/groups/${id}`, { method: 'DELETE' }),
};

/** @deprecated Use deviceApi.list */
export const getDevices = () => deviceApi.list();

export const userApi = {
  list: () => fetchApi('/users'),
  get: (id) => fetchApi(`/users/${id}`),
  create: (payload) => fetchApi('/users', { method: 'POST', body: payload }),
  update: (id, payload) => fetchApi(`/users/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
  updateAttribute: async (id, key, value) => {
    const current = await fetchApi(`/users/${id}`);
    const attributes = { ...(current.attributes ?? {}), [key]: value };
    return fetchApi(`/users/${id}`, { method: 'PUT', body: { ...current, attributes } });
  },
};

export const permissionsApi = {
  list: ({ geofenceId, deviceId } = {}) => {
    const params = new URLSearchParams();
    if (geofenceId != null) params.set('geofenceId', geofenceId);
    if (deviceId != null) params.set('deviceId', deviceId);
    const qs = params.toString();
    return fetchApi(qs ? `/permissions?${qs}` : '/permissions');
  },
  link: (payload) => fetchApi('/permissions', { method: 'POST', body: payload }),
  unlink: ({ deviceId, geofenceId }) =>
    fetchApi(`/permissions?deviceId=${deviceId}&geofenceId=${geofenceId}`, { method: 'DELETE' }),
};

function buildReportQuery({ deviceIds = [], groupIds = [], from, to }) {
  const params = new URLSearchParams({ from, to });
  deviceIds.forEach((id) => params.append('deviceId', id));
  groupIds.forEach((id) => params.append('groupId', id));
  return params.toString();
}

export const reportApi = {
  trips: (query) => fetchApi(`/reports/trips?${buildReportQuery(query)}`),
  events: (query) => fetchApi(`/reports/events?${buildReportQuery(query)}`),
  summary: (query) => fetchApi(`/reports/summary?${buildReportQuery(query)}`),
  stops: (query) => fetchApi(`/reports/stops?${buildReportQuery(query)}`),
};
