/**
 * Mirrors docker/nginx/csrf.conf validation rules (for tests).
 */
const MUTATING = /^(POST|PUT|DELETE|PATCH)$/;

export function shouldCsrfReject({ method, uri, headerToken, cookieToken }) {
  if (!MUTATING.test(method)) return false;
  if (uri === '/api/session') return false;
  if (uri === '/api/_csrf-bootstrap') return false;
  if (!headerToken || !cookieToken) return true;
  return headerToken !== cookieToken;
}
