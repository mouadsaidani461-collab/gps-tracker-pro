/**
 * Traccar REST client — session cookie auth (credentials: include)
 */

import { getCsrfHeaders } from '../utils/csrf';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export const UNAUTHORIZED_EVENT = 'capture:unauthorized';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function dispatchUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export class ApiError extends Error {
  constructor(message, status, { totpRequired = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.totpRequired = totpRequired;
  }
}

export async function fetchApi(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const { headers: customHeaders, body, ...rest } = options;
  const headers = { ...customHeaders };

  if (MUTATING_METHODS.has(method)) {
    Object.assign(headers, getCsrfHeaders());
  }

  if (
    body
    && !(body instanceof URLSearchParams)
    && !(body instanceof FormData)
    && !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...rest,
    headers,
    body: body && !(body instanceof URLSearchParams) && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body,
  });

  if (!response.ok) {
    const totpRequired = path === '/session'
      && method === 'POST'
      && response.status === 401
      && response.headers.get('WWW-Authenticate') === 'TOTP';

    if ((response.status === 401 || response.status === 403) && path !== '/session') {
      dispatchUnauthorized();
    }

    const text = await response.text();
    throw new ApiError(text || response.statusText, response.status, { totpRequired });
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (API_BASE.startsWith('http')) {
    const url = new URL(API_BASE);
    return `${protocol}//${url.host}/api/socket`;
  }
  return `${protocol}//${window.location.host}/api/socket`;
}

export { API_BASE };
