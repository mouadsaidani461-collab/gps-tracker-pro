import { describe, it, expect } from 'vitest';
import {
  parseTwoFactorEnabled,
  isTwoFactorLocked,
  USER_ATTR_CAPTURE_2FA,
} from '../../src/utils/userAttributes';

describe('userAttributes', () => {
  it('reads capture2fa attribute from Traccar user', () => {
    expect(parseTwoFactorEnabled({ attributes: { [USER_ATTR_CAPTURE_2FA]: true } })).toBe(true);
    expect(parseTwoFactorEnabled({ attributes: { [USER_ATTR_CAPTURE_2FA]: 'true' } })).toBe(true);
    expect(parseTwoFactorEnabled({ attributes: { [USER_ATTR_CAPTURE_2FA]: false } })).toBe(false);
  });

  it('treats totpKey as enabled and locked', () => {
    const user = { totpKey: 'secret', attributes: { [USER_ATTR_CAPTURE_2FA]: false } };
    expect(parseTwoFactorEnabled(user)).toBe(true);
    expect(isTwoFactorLocked(user)).toBe(true);
  });
});
