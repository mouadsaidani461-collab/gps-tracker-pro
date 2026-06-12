/** Traccar user attribute helpers (server-side user.attributes). */

export const USER_ATTR_CAPTURE_2FA = 'capture2fa';

export function parseTwoFactorEnabled(traccarUser) {
  if (!traccarUser) return false;
  if (traccarUser.totpKey) return true;
  const value = traccarUser.attributes?.[USER_ATTR_CAPTURE_2FA];
  return value === true || value === 'true';
}

export function isTwoFactorLocked(traccarUser) {
  return Boolean(traccarUser?.totpKey);
}
