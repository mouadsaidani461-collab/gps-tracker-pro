import { describe, it, expect, beforeEach } from 'vitest';
import {
  initCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  getCsrfHeaders,
  CSRF_COOKIE,
  CSRF_HEADER,
} from '../../src/utils/csrf';

describe('csrf double-submit cookie', () => {
  beforeEach(() => {
    clearCsrfToken();
    document.cookie = `${CSRF_COOKIE}=; Path=/; Max-Age=0`;
  });

  it('initCsrfToken writes cookie readable by getCsrfToken', () => {
    const token = initCsrfToken();
    expect(token).toHaveLength(64);
    expect(getCsrfToken()).toBe(token);
  });

  it('getCsrfHeaders returns matching X-CSRF-Token header', () => {
    initCsrfToken();
    const headers = getCsrfHeaders();
    expect(headers[CSRF_HEADER]).toBe(getCsrfToken());
  });

  it('clearCsrfToken removes the cookie', () => {
    initCsrfToken();
    clearCsrfToken();
    expect(getCsrfToken()).toBeNull();
    expect(getCsrfHeaders()).toEqual({});
  });
});
