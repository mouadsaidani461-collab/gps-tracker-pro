/**
 * CSRF double-submit cookie — token in cookie + X-CSRF-Token header on mutating requests.
 * nginx validates cookie === header for POST/PUT/DELETE/PATCH (except POST /api/session login).
 */

const CSRF_COOKIE = 'capture_csrf';
const CSRF_HEADER = 'X-CSRF-Token';

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match || !match[1]) return null;
  return decodeURIComponent(match[1]);
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict${secure}`;
}

function clearCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict`;
}

/** Create or rotate CSRF token after successful authentication. */
export function initCsrfToken() {
  const token = randomToken();
  writeCookie(CSRF_COOKIE, token);
  return token;
}

export function getCsrfToken() {
  return readCookie(CSRF_COOKIE);
}

export function clearCsrfToken() {
  clearCookie(CSRF_COOKIE);
}

/** Headers for state-changing API calls (nginx compares header to cookie). */
export function getCsrfHeaders() {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER]: token };
}

export { CSRF_COOKIE, CSRF_HEADER };
