/** Traccar user attribute helpers (server-side user.attributes). */

export const USER_ATTR_CAPTURE_2FA = 'capture2fa';
export const USER_ATTR_CAPTURE_AVATAR = 'captureAvatar';

export function parseAvatarFromUser(traccarUser) {
  const value = traccarUser?.attributes?.[USER_ATTR_CAPTURE_AVATAR];
  if (typeof value === 'string' && value.startsWith('data:image/')) return value;
  return null;
}

export function parseTwoFactorEnabled(traccarUser) {
  if (!traccarUser) return false;
  if (traccarUser.totpKey) return true;
  const value = traccarUser.attributes?.[USER_ATTR_CAPTURE_2FA];
  return value === true || value === 'true';
}

export function isTwoFactorLocked(user) {
  if (!user) return false;
  if (user.twoFactorEnabled === true) return true;
  return Boolean(user.totpKey) || parseTwoFactorEnabled(user);
}
