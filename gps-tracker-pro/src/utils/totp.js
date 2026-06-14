/**
 * TOTP helpers — Traccar stores totpKey on user; verification at login is server-side.
 */

import { TOTP } from 'otpauth';

export function buildTotpAuthUrl(email, secret, issuer = 'Capture Tracking GPS') {
  const totp = new TOTP({
    issuer,
    label: email,
    secret,
  });
  return totp.toString();
}

export function verifyTotpCode(secret, code) {
  if (!secret || !code) return false;
  const normalized = String(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const totp = new TOTP({ secret });
  return totp.validate({ token: normalized, window: 1 }) !== null;
}

export async function generateQrDataUrl(text) {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(text, {
    width: 200,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}
