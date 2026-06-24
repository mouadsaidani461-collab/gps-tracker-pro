/** Traccar server attribute keys (see org.traccar.config.Keys WEB_TOTP_*). */
export const SERVER_ATTR_TOTP_ENABLE = 'totpEnable';
export const SERVER_ATTR_TOTP_FORCE = 'totpForce';

/** Whether Traccar allows POST /api/users/totp (QR enrollment). */
export function parseTotpServerEnabled(server) {
  const value = server?.attributes?.[SERVER_ATTR_TOTP_ENABLE];
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return false;
}
