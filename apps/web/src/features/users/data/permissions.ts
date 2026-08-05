import { ROLES, SIDEBAR_MENU } from '#/features/console/index.ts'
import type { RoleKey } from '#/features/console/index.ts'

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
}

export type ModulePermissions = Record<PermissionAction, boolean>

/** matrix[roleKey][modulePath] → granted actions for that module. */
export type RolePermissionMatrix = Record<
  RoleKey,
  Record<string, ModulePermissions>
>

export const SYSTEM_ADMIN: RoleKey = 'System_Administrator'

/**
 * Default matrix derived from SIDEBAR_MENU.allowedRoles (the same catalogue
 * the sidebar filters on): allowed roles get view/create/update on their
 * modules, delete stays reserved to System Administrator. Client-side only —
 * this becomes the backend role model's seed once it exists.
 */
export function seedRolePermissions(): RolePermissionMatrix {
  const matrix = {} as RolePermissionMatrix
  for (const role of ROLES) {
    const perRole: Record<string, ModulePermissions> = {}
    for (const group of SIDEBAR_MENU) {
      for (const sub of group.submenus) {
        const allowed = sub.allowedRoles.includes(role.key)
        perRole[sub.path] = {
          view: allowed,
          create: allowed,
          update: allowed,
          delete: allowed && role.key === SYSTEM_ADMIN,
        }
      }
    }
    matrix[role.key] = perRole
  }
  return matrix
}

/** Default permissions for a single role (used by "Reset to defaults"). */
export function seedRoleDefaults(
  role: RoleKey,
): Record<string, ModulePermissions> {
  return seedRolePermissions()[role]
}

/** Grants a role holds on a module; undefined when the matrix doesn't know
 * the role (keys stored in the DB outside the console catalogue). */
export function rolePermissionsFor(
  matrix: RolePermissionMatrix,
  role: string,
  path: string,
): ModulePermissions | undefined {
  return (
    matrix as Record<string, Record<string, ModulePermissions> | undefined>
  )[role]?.[path]
}

/** Union of the actions a user's roles grant on a module. Roles without a
 * matrix entry contribute nothing. */
export function effectiveActions(
  roles: Array<string>,
  matrix: RolePermissionMatrix,
  path: string,
): ModulePermissions {
  const result: ModulePermissions = {
    view: false,
    create: false,
    update: false,
    delete: false,
  }
  for (const role of roles) {
    const perms = rolePermissionsFor(matrix, role, path)
    if (!perms) continue
    for (const action of PERMISSION_ACTIONS) {
      if (perms[action]) result[action] = true
    }
  }
  return result
}
