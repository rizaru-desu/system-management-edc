/**
 * Roles a user can hold *at a service point*. Contextual only — they never
 * replace the account's global application role (see `ROLES` in the console
 * feature). Mirrors the backend's RoleAtServicePoint catalogue.
 */
export const SERVICE_POINT_ROLES = [
  { key: 'leader', label: 'Leader' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'engineer', label: 'Engineer' },
  { key: 'admin', label: 'Admin' },
  { key: 'technician', label: 'Technician' },
] as const

export type ServicePointRoleKey = (typeof SERVICE_POINT_ROLES)[number]['key']

const ROLE_KEYS = new Set<string>(SERVICE_POINT_ROLES.map((role) => role.key))

/** Backend enum (e.g. "LEADER") → frontend key; unknown keys fall back to
 * engineer so a future backend role never crashes the drawer. */
export function fromBackendRole(role: string): ServicePointRoleKey {
  const key = role.toLowerCase()
  return ROLE_KEYS.has(key) ? (key as ServicePointRoleKey) : 'engineer'
}

/** Frontend key → the backend's uppercase enum. */
export function toBackendRole(role: ServicePointRoleKey): string {
  return role.toUpperCase()
}

export type AssignmentStatus = 'active' | 'inactive'

/**
 * One user ⇄ service point link, mirroring the backend `Assignment` shape
 * (id / userId / servicePointId / roleAtServicePoint / isDefault /
 * assignedAt / status). Served by GET /users/:userId/service-points.
 */
export interface ServicePointAssignment {
  id: string
  userId: string
  servicePointId: string
  roleAtServicePoint: ServicePointRoleKey
  isDefault: boolean
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  assignedAt: string
  status: AssignmentStatus
}
