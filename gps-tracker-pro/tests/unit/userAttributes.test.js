import { describe, it, expect } from 'vitest';
import {
  parseTwoFactorEnabled,
  isTwoFactorLocked,
  parseAvatarFromUser,
  USER_ATTR_CAPTURE_2FA,
  USER_ATTR_CAPTURE_AVATAR,
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

  it('reads captureAvatar data URL from Traccar user', () => {
    const avatar = 'data:image/jpeg;base64,/9j/4AAQ';
    expect(parseAvatarFromUser({ attributes: { [USER_ATTR_CAPTURE_AVATAR]: avatar } })).toBe(avatar);
    expect(parseAvatarFromUser({ attributes: { [USER_ATTR_CAPTURE_AVATAR]: 'http://x' } })).toBeNull();
    expect(parseAvatarFromUser({ attributes: {} })).toBeNull();
  });
});
