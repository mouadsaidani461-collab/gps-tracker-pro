import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  getCsrfHeaders,
  CSRF_HEADER,
  CSRF_BOOTSTRAP_PATH,
} from '../../src/utils/csrf';

describe('csrf double-submit cookie', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initCsrfToken stores token in session memory', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const token = await initCsrfToken();
    expect(token).toHaveLength(64);
    expect(getCsrfToken()).toBe(token);
  });

  it('getCsrfHeaders returns matching X-CSRF-Token header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await initCsrfToken();
    const headers = getCsrfHeaders();
    expect(headers[CSRF_HEADER]).toBe(getCsrfToken());
  });

  it('clearCsrfToken clears session memory', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await initCsrfToken();
    await clearCsrfToken();
    expect(getCsrfToken()).toBeNull();
    expect(getCsrfHeaders()).toEqual({});
  });

  it('bootstrap uses HttpOnly cookie endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const token = await initCsrfToken();
    expect(fetchMock).toHaveBeenCalledWith(CSRF_BOOTSTRAP_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { [CSRF_HEADER]: token },
    });
  });
});
