import { SEED_SERVICE_POINTS } from '#/features/service-points/index.ts'
import type { ServicePointRecord } from '#/features/service-points/index.ts'
import type { UserRecord } from './users.ts'

/**
 * Roles a user can hold *at a service point*. Contextual only — they never
 * replace the account's global application role (see `ROLES` in the console
 * feature).
 */
export const SERVICE_POINT_ROLES = [
  { key: 'leader', label: 'Leader' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'engineer', label: 'Engineer' },
  { key: 'admin', label: 'Admin' },
] as const

export type ServicePointRoleKey = (typeof SERVICE_POINT_ROLES)[number]['key']

export type AssignmentStatus = 'active' | 'inactive'

/**
 * One user ⇄ service point link. The shape mirrors the future backend
 * `Assignment` table (id / userId / servicePointId / roleAtServicePoint /
 * isDefault / assignedAt / status) so wiring the API in later is a data-source
 * swap, not a UI rewrite. Mock-only for now — nothing here persists.
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

/**
 * Service points a user can be assigned to. Reuses the Service Point module's
 * master seed so both modules stay on one catalogue; the future backend
 * replaces this with the real service point list.
 */
export const SERVICE_POINT_CATALOGUE: Array<ServicePointRecord> =
  SEED_SERVICE_POINTS

const CATALOGUE_BY_NAME = new Map(
  SERVICE_POINT_CATALOGUE.map((servicePoint) => [
    servicePoint.name,
    servicePoint,
  ]),
)

/**
 * Deterministic id so seeded assignments are stable across renders and SSR.
 * One assignment per (user, service point) pair — duplicates are invalid.
 */
export function assignmentId(userId: string, servicePointId: string): string {
  return `spa-${userId}-${servicePointId}`
}

/** Small deterministic hash — mock variety without Math.random (SSR-safe). */
function hashOf(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function seedEntry(
  userId: string,
  servicePoint: ServicePointRecord,
  roleAtServicePoint: ServicePointRoleKey,
  isDefault: boolean,
  assignedAt: string,
): ServicePointAssignment {
  return {
    id: assignmentId(userId, servicePoint.id),
    userId,
    servicePointId: servicePoint.id,
    roleAtServicePoint,
    isDefault,
    assignedAt,
    status: 'active',
  }
}

/**
 * Mock assignments for a user (0–3 entries picked deterministically from the
 * catalogue, first one default). The spec's demo account gets its exact
 * example: Jakarta Selatan (Leader, default), BSD (Engineer), Tangerang
 * (Engineer). Purely a UI stand-in until the Assignment API exists.
 */
export function seedAssignmentsForUser(
  user: Pick<UserRecord, 'id' | 'name'>,
): Array<ServicePointAssignment> {
  if (user.name.trim().toLowerCase() === 'albert einstein') {
    const jakartaSelatan = CATALOGUE_BY_NAME.get('Jakarta Selatan')
    const bsd = CATALOGUE_BY_NAME.get('BSD')
    const tangerang = CATALOGUE_BY_NAME.get('Tangerang')
    if (jakartaSelatan && bsd && tangerang) {
      return [
        seedEntry(user.id, jakartaSelatan, 'leader', true, '2025-02-10'),
        seedEntry(user.id, bsd, 'engineer', false, '2025-03-24'),
        seedEntry(user.id, tangerang, 'engineer', false, '2025-05-06'),
      ]
    }
  }

  const hash = hashOf(user.id)
  const count = hash % 4
  if (count === 0) return []

  const catalogueSize = SERVICE_POINT_CATALOGUE.length
  const start = hash % catalogueSize
  const month = String((hash % 12) + 1).padStart(2, '0')
  return Array.from({ length: count }, (_, index) => {
    const servicePoint =
      SERVICE_POINT_CATALOGUE[(start + index) % catalogueSize]
    const role = SERVICE_POINT_ROLES[(hash + index) % SERVICE_POINT_ROLES.length]
    // Unsigned shift: hash tops 2^31, and a signed shift would go negative.
    const day = String(((hash >>> 4) % 25) + 1 + index).padStart(2, '0')
    return seedEntry(
      user.id,
      servicePoint,
      role.key,
      index === 0,
      `2025-${month}-${day}`,
    )
  })
}
