export { UsersPage } from './components/users-page.tsx'
export { UserFormModal } from './components/user-form-modal.tsx'
export { PermissionsModal } from './components/permissions-modal.tsx'
export { RolePermissionsModal } from './components/role-permissions-modal.tsx'
export { RoleBadge } from './components/role-badge.tsx'
export { usersQueryKey, usersQueryOptions } from './api/list-users.ts'
export { userStatsQueryKey, userStatsQueryOptions } from './api/user-stats.ts'
export {
  rolePermissionsQueryKey,
  rolePermissionsQueryOptions,
  useSaveRolePermissions,
} from './api/role-permissions.ts'
export type { UserRecord, UserStatus } from './data/users.ts'
export type { UserFormValues } from './components/user-form-modal.tsx'
export {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  effectiveActions,
  seedRolePermissions,
} from './data/permissions.ts'
export type {
  ModulePermissions,
  PermissionAction,
  RolePermissionMatrix,
} from './data/permissions.ts'
