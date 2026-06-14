import { describe, it, expect } from 'vitest';
import { TOTP } from 'otpauth';
import { buildTotpAuthUrl, verifyTotpCode } from '../../src/utils/totp';

describe('TOTP enrollment helpers', () => {
  it('builds otpauth URI for QR codes', () => {
    const url = buildTotpAuthUrl('user@test.com', 'JBSWY3DPEHPK3PXP');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('user%40test.com');
  });

  it('verifies a valid 6-digit TOTP code', () => {
    const secret = new TOTP().secret.base32;
    const token = new TOTP({ secret }).generate();
    expect(verifyTotpCode(secret, token)).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(verifyTotpCode('JBSWY3DPEHPK3PXP', '000000')).toBe(false);
    expect(verifyTotpCode('JBSWY3DPEHPK3PXP', 'abc')).toBe(false);
  });
});
