import { describe, it, expect } from 'vitest';
import { ROLES } from '../../src/utils/authRoles';
import { canAccessRoute, buildRouteAccessMatrix, PROTECTED_ROUTE_GUARDS } from '../../src/utils/routeAccess';

describe('canAccessRoute', () => {
  it('denies viewer access to /users and /devices', () => {
    expect(canAccessRoute(ROLES.VIEWER, '/users')).toBe(false);
    expect(canAccessRoute(ROLES.VIEWER, '/devices')).toBe(false);
    expect(canAccessRoute(ROLES.VIEWER, '/geofences/edit/42')).toBe(false);
  });

  it('allows operator devices + geofence write but not users', () => {
    expect(canAccessRoute(ROLES.OPERATOR, '/devices')).toBe(true);
    expect(canAccessRoute(ROLES.OPERATOR, '/geofences/edit/42')).toBe(true);
    expect(canAccessRoute(ROLES.OPERATOR, '/users')).toBe(false);
  });

  it('allows admin full access to protected routes', () => {
    PROTECTED_ROUTE_GUARDS.forEach(({ path }) => {
      const testPath = path.replace(':id', '1');
      expect(canAccessRoute(ROLES.ADMIN, testPath)).toBe(true);
    });
  });

  it('allows all roles read routes (dashboard, vehicles, reports, settings)', () => {
    [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER].forEach((role) => {
      expect(canAccessRoute(role, '/dashboard')).toBe(true);
      expect(canAccessRoute(role, '/vehicles')).toBe(true);
      expect(canAccessRoute(role, '/reports')).toBe(true);
      expect(canAccessRoute(role, '/settings')).toBe(true);
    });
  });

  it('buildRouteAccessMatrix covers every role × route', () => {
    const matrix = buildRouteAccessMatrix();
    expect(matrix).toHaveLength(PROTECTED_ROUTE_GUARDS.length * 3);
  });
});
