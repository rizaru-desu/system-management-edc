/** The four actions a role can be granted on a module (the V/C/U/D matrix). */
export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * Console role that is always full-access. It is locked in the UI and never
 * stored in `role_permission`; the guard short-circuits on it and saves that
 * include it are stripped as defense in depth.
 */
export const SYSTEM_ADMIN_ROLE = 'System_Administrator';

/**
 * Normalizes a raw `user.role` value (possibly a comma-separated list) into
 * unique console role keys. The Better Auth role catalogue (`@repo/auth`
 * permissions.ts) uses the same wording as the console keys, so no mapping
 * is needed.
 */
export function normalizeUserRoles(role: string | null | undefined): string[] {
  if (!role) return [];
  const keys = role
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return [...new Set(keys)];
}
