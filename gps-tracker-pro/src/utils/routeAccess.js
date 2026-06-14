/**
 * Route access matrix — used by route guards and RBAC tests.
 */

import { ROLES, hasPermission } from './authRoles';

/** @typedef {'authenticated' | 'admin' | string} RouteGuard */

/** @type {{ path: string, guard: RouteGuard, label?: string }[]} */
export const PROTECTED_ROUTE_GUARDS = [
  { path: '/dashboard', guard: 'authenticated', label: 'Dashboard' },
  { path: '/map', guard: 'authenticated', label: 'Map' },
  { path: '/vehicles', guard: 'authenticated', label: 'Vehicles' },
  { path: '/reports', guard: 'reports:read', label: 'Reports' },
  { path: '/settings', guard: 'authenticated', label: 'Settings' },
  { path: '/users', guard: 'admin', label: 'Users' },
  { path: '/devices', guard: 'vehicles:write', label: 'Devices' },
  { path: '/geofences/edit/:id', guard: 'geofences:write', label: 'Geofence edit' },
];

/**
 * @param {string | null | undefined} role
 * @param {string} path
 * @returns {boolean}
 */
export function canAccessRoute(role, path) {
  if (!role) return false;

  const normalized = path.split('?')[0];
  let guard = 'authenticated';

  if (normalized.startsWith('/geofences/edit/')) {
    guard = 'geofences:write';
  } else {
    const entry = PROTECTED_ROUTE_GUARDS.find((r) => r.path === normalized);
    if (entry) guard = entry.guard;
  }

  if (guard === 'authenticated') return true;
  if (guard === 'admin') return role === ROLES.ADMIN;
  return hasPermission(role, guard);
}

/** All role × route combinations for audit / E2E matrices. */
export function buildRouteAccessMatrix() {
  const roles = [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER];
  return PROTECTED_ROUTE_GUARDS.flatMap(({ path, label }) =>
    roles.map((role) => ({
      path,
      label,
      role,
      allowed: canAccessRoute(role, path.replace(':id', '1')),
    })),
  );
}
