// @vitest-environment node
/**
 * TOTP auth flow tests (unit + optional live Traccar).
 * Live: TOTP_E2E_BASE=http://localhost:3000 npm test tests/e2e/totp.spec.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOTP } from 'otpauth';
import { ApiError } from '../../src/services/api.js';
import { verifyTotpCode, buildTotpAuthUrl } from '../../src/utils/totp.js';
import { parseTwoFactorEnabled, isTwoFactorLocked } from '../../src/utils/userAttributes.js';

describe('TOTP enrollment helpers', () => {
  it('builds otpauth:// URL for QR', () => {
    const url = buildTotpAuthUrl('user@test.com', 'JBSWY3DPEHPK3PXP');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('Capture%20Tracking%20GPS');
  });

  it('verifies valid 6-digit code', () => {
    const secret = new TOTP().secret.base32;
    const token = new TOTP({ secret }).generate();
    expect(verifyTotpCode(secret, token)).toBe(true);
  });

  it('rejects invalid code', () => {
    expect(verifyTotpCode('JBSWY3DPEHPK3PXP', '000000')).toBe(false);
  });
});

describe('ApiError TOTP detection', () => {
  it('exposes totpRequired flag', () => {
    const err = new ApiError('TOTP required', 401, { totpRequired: true });
    expect(err.totpRequired).toBe(true);
    expect(err.status).toBe(401);
  });
});

describe('user 2FA state', () => {
  it('detects locked when totpKey present on server user', () => {
    const raw = { totpKey: 'SECRET', attributes: {} };
    expect(parseTwoFactorEnabled(raw)).toBe(true);
    expect(isTwoFactorLocked(raw)).toBe(true);
  });

  it('mapped client user has no totpKey field', () => {
    const mapped = { twoFactorEnabled: true, attributes: {} };
    expect(mapped.totpKey).toBeUndefined();
    expect(isTwoFactorLocked({ ...mapped, totpKey: 'x' })).toBe(true);
  });
});

describe('login TOTP step machine (mocked)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('password login → totpRequired when WWW-Authenticate TOTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: (h) => (h === 'WWW-Authenticate' ? 'TOTP' : null) },
      text: async () => 'TOTP',
    }));

    const { sessionApi } = await import('../../src/services/traccarApi.js');
    await expect(sessionApi.login('a@b.com', 'pass')).rejects.toMatchObject({
      status: 401,
      totpRequired: true,
    });
  });

  it('login with code succeeds when session returns user', async () => {
    const user = { id: 1, email: 'a@b.com', name: 'A', administrator: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => user,
    }));

    const { sessionApi } = await import('../../src/services/traccarApi.js');
    const result = await sessionApi.login('a@b.com', 'pass', '123456');
    expect(result.id).toBe(1);
  });
});

const TOTP_E2E_BASE = globalThis.process?.env?.TOTP_E2E_BASE;

if (TOTP_E2E_BASE) {
  describe('TOTP live API (Traccar)', () => {
    const base = TOTP_E2E_BASE.replace(/\/$/, '');

    it('POST /api/session without TOTP may return 401+TOTP when 2FA enabled', async () => {
      const response = await fetch(`${base}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: globalThis.process.env.TOTP_E2E_EMAIL ?? '',
          password: globalThis.process.env.TOTP_E2E_PASSWORD ?? '',
        }),
      });
      if (!globalThis.process.env.TOTP_E2E_EMAIL) {
        expect([401, 200, 415]).toContain(response.status);
        return;
      }
      expect([401, 200]).toContain(response.status);
      if (response.status === 401) {
        expect(response.headers.get('WWW-Authenticate')).toBe('TOTP');
      }
    });
  });
}
