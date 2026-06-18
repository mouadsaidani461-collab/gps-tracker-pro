/**
 * CSRF double-submit — token in HttpOnly cookie (nginx) + X-CSRF-Token header.
 * Token lives in session memory only (never localStorage); nginx sets HttpOnly cookie
 * via POST /api/_csrf-bootstrap after login.
 */

const CSRF_COOKIE = 'capture_csrf';
const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_BOOTSTRAP_PATH = '/api/_csrf-bootstrap';

let sessionToken = null;

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function bootstrapHttpOnlyCookie(token) {
  const response = await fetch(CSRF_BOOTSTRAP_PATH, {
    method: 'POST',
    credentials: 'include',
    headers: { [CSRF_HEADER]: token },
  });
  if (!response.ok) {
    throw new Error(`CSRF bootstrap failed: ${response.status}`);
  }
}

/** Create or rotate CSRF token after successful authentication. */
export async function initCsrfToken() {
  const token = randomToken();
  sessionToken = token;
  await bootstrapHttpOnlyCookie(token);
  return token;
}

export function getCsrfToken() {
  return sessionToken;
}

export async function clearCsrfToken() {
  sessionToken = null;
  try {
    await fetch(CSRF_BOOTSTRAP_PATH, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // optional — cookie may already be gone
  }
}

/** Headers for state-changing API calls (nginx compares header to HttpOnly cookie). */
export function getCsrfHeaders() {
  if (!sessionToken) return {};
  return { [CSRF_HEADER]: sessionToken };
}

export { CSRF_COOKIE, CSRF_HEADER, CSRF_BOOTSTRAP_PATH };
