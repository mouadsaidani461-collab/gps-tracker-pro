import { fetchApi } from './api';

export const sessionApi = {
  get: () => fetchApi('/session'),
  login: (email, password, code) => {
    let query = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    if (code) query += `&code=${encodeURIComponent(code)}`;
    return fetchApi('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(query),
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

export const userApi = {
  list: () => fetchApi('/users'),
  get: (id) => fetchApi(`/users/${id}`),
  create: (payload) => fetchApi('/users', { method: 'POST', body: payload }),
  update: (id, payload) => fetchApi(`/users/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
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
