import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  getCsrfHeaders,
  CSRF_HEADER,
  CSRF_BOOTSTRAP_PATH,
} from '../src/utils/csrf';
import { shouldCsrfReject } from '../src/utils/nginxCsrf';

describe('nginx CSRF policy', () => {
  it('POST without token → reject', () => {
    expect(shouldCsrfReject({
      method: 'POST',
      uri: '/api/devices',
      headerToken: '',
      cookieToken: 'abc',
    })).toBe(true);
  });

  it('POST with valid matching token → allow', () => {
    expect(shouldCsrfReject({
      method: 'POST',
      uri: '/api/devices',
      headerToken: 'same-token',
      cookieToken: 'same-token',
    })).toBe(false);
  });

  it('POST with wrong token → reject', () => {
    expect(shouldCsrfReject({
      method: 'POST',
      uri: '/api/devices',
      headerToken: 'wrong',
      cookieToken: 'expected',
    })).toBe(true);
  });

  it('POST /api/session (login) → allow without token', () => {
    expect(shouldCsrfReject({
      method: 'POST',
      uri: '/api/session',
      headerToken: '',
      cookieToken: '',
    })).toBe(false);
  });
});

describe('csrf session memory + HttpOnly bootstrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initCsrfToken stores token in memory and bootstraps HttpOnly cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const token = await initCsrfToken();
    expect(token).toHaveLength(64);
    expect(getCsrfToken()).toBe(token);
    expect(fetchMock).toHaveBeenCalledWith(CSRF_BOOTSTRAP_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { [CSRF_HEADER]: token },
    });
  });

  it('getCsrfHeaders returns matching X-CSRF-Token header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await initCsrfToken();
    const headers = getCsrfHeaders();
    expect(headers[CSRF_HEADER]).toBe(getCsrfToken());
  });

  it('clearCsrfToken clears memory and calls bootstrap DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await initCsrfToken();
    await clearCsrfToken();
    expect(getCsrfToken()).toBeNull();
    expect(getCsrfHeaders()).toEqual({});
    expect(fetchMock).toHaveBeenLastCalledWith(CSRF_BOOTSTRAP_PATH, {
      method: 'DELETE',
      credentials: 'include',
    });
  });
});

