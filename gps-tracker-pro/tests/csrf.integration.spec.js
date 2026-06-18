// @vitest-environment node
/**
 * Live nginx CSRF checks — requires running frontend:
 *   docker compose up -d --build frontend
 *   CSRF_TEST_BASE=http://localhost:3000 npm test
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { CSRF_HEADER } from '../src/utils/csrf.js';

const CSRF_TEST_BASE = globalThis.process?.env?.CSRF_TEST_BASE?.replace(/\/$/, '');

describe.skipIf(!CSRF_TEST_BASE)('nginx CSRF integration', () => {
  let base;

  beforeAll(() => {
    base = CSRF_TEST_BASE;
  });

  it('POST without token → 403', async () => {
    const response = await fetch(`${base}/api/server`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(403);
  });

  it('POST with valid token → not 403', async () => {
    const token = 'a'.repeat(64);
    const response = await fetch(`${base}/api/server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER]: token,
        Cookie: `capture_csrf=${token}`,
      },
      body: '{}',
    });
    expect(response.status).not.toBe(403);
  });

  it('POST with wrong token → 403', async () => {
    const response = await fetch(`${base}/api/server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER]: 'wrong-token',
        Cookie: 'capture_csrf=expected-token',
      },
      body: '{}',
    });
    expect(response.status).toBe(403);
  });
});
