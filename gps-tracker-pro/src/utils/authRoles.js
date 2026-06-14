/** RBAC roles — see docs/AUDIT_REPORT.md permission matrix */

import { translate } from '../i18n';
import { LOCALE } from './constants';

export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
};

/** @deprecated Use getRoleLabel(role, language) for locale-aware labels */
export const ROLE_LABELS = {
  admin: 'مدير',
  operator: 'مشغّل',
  viewer: 'مشاهد',
};

export function getRoleLabel(role, language = LOCALE.fallback) {
  return translate(language, `roles.${role}`);
}

/** Map Traccar session user flags to app RBAC role. */
export function resolveRoleFromTraccarUser(user) {
  if (!user) return null;
  if (user.administrator) return ROLES.ADMIN;
  if (user.readonly) return ROLES.VIEWER;
  return ROLES.OPERATOR;
}

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  operator: [
    'dashboard:read',
    'vehicles:read',
    'vehicles:write',
    'map:read',
    'geofences:write',
    'reports:read',
    'notifications:read',
  ],
  viewer: ['dashboard:read', 'vehicles:read', 'map:read', 'reports:read'],
};

export function hasPermission(role, permission) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}
