import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  ServicePointRecord,
  ServicePointStatus,
} from '../data/service-points.ts'

/** Row shape returned by the backend's /service-points endpoints. */
export interface BackendServicePoint {
  id: string
  parentId: string | null
  code: string
  name: string
  region: string | null
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  /** Service area radius (km) for automatic merchant assignment. */
  coverageRadiusKm: number | null
  notes: string | null
  status: 'ACTIVE' | 'INACTIVE'
  /** Users linked via ACTIVE service point assignments. */
  assignedUsers: number
  createdAt: string
  updatedAt: string
}

/** Node shape of GET /service-points/tree: a row plus nested children. */
export interface BackendServicePointTreeNode extends BackendServicePoint {
  children: Array<BackendServicePointTreeNode>
}

export function toServicePointRecord(
  row: BackendServicePoint,
): ServicePointRecord {
  return {
    id: row.id,
    parentId: row.parentId,
    code: row.code,
    name: row.name,
    region: row.region,
    address: row.address,
    phone: row.phone,
    email: row.email,
    latitude: row.latitude,
    longitude: row.longitude,
    coverageRadiusKm: row.coverageRadiusKm ?? null,
    notes: row.notes,
    status: row.status.toLowerCase() as ServicePointStatus,
    // Live ACTIVE-assignment count computed by the backend row select; the
    // null guard keeps older payload shapes rendering as an em dash.
    assignedUsers:
      typeof row.assignedUsers === 'number' ? row.assignedUsers : null,
    createdAt: new Date(row.createdAt).toISOString().slice(0, 10),
  }
}

/** Maps a frontend status filter/value onto the backend's uppercase enum. */
export function toBackendStatus(
  status: ServicePointStatus,
): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

export function servicePointError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage service points.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** Depth-first flatten; `parentId` already encodes the hierarchy. */
function flattenTree(
  nodes: Array<BackendServicePointTreeNode>,
  into: Array<ServicePointRecord> = [],
): Array<ServicePointRecord> {
  for (const node of nodes) {
    into.push(toServicePointRecord(node))
    flattenTree(node.children, into)
  }
  return into
}

/**
 * Fetches the full live hierarchy from GET /service-points/tree (gated by
 * the service-points-module "view" grant) and flattens it back to records —
 * the page's tree table, filters and pagination all derive from the flat
 * `parentId` list client-side, exactly as they did over the mock data.
 * Cookie forwarding follows the same SSR reasoning as the users feature.
 */
const fetchServicePointTree = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ServicePointRecord>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendServicePointTreeNode>>(
        'service-points/tree',
        { headers: { cookie } },
      )
      return flattenTree(response.data)
    } catch (err: unknown) {
      throw servicePointError(err, 'Failed to load service points')
    }
  },
)

/** Base key shared by every service point query (tree, list, detail). */
export const servicePointsQueryKey = ['service-points'] as const

export const servicePointTreeQueryKey = [
  ...servicePointsQueryKey,
  'tree',
] as const

export const servicePointTreeQueryOptions = () =>
  queryOptions({
    queryKey: servicePointTreeQueryKey,
    queryFn: () => fetchServicePointTree(),
    staleTime: 30_000,
  })
