import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  WarehouseRecord,
  WarehouseStatus,
  WarehouseType,
} from '../data/warehouses.ts'

/** Backend enum values (display labels stay title-case in the console). */
export type BackendWarehouseType = 'CENTRAL' | 'REGIONAL' | 'SERVICE_POINT'

/** Row shape returned by the backend's /warehouses endpoints. */
export interface BackendWarehouse {
  id: string
  name: string
  code: string
  type: BackendWarehouseType
  parentId: string | null
  /** Parent name/code ride along via the backend's self-join. */
  parentName: string | null
  parentCode: string | null
  region: string
  address: string
  picName: string
  picContact: string | null
  capacity: number | null
  status: 'ACTIVE' | 'INACTIVE'
  /** Terminals stored here (0 until the Terminals module lands). */
  terminalCount: number
  createdAt: string
  updatedAt: string
}

/** Node shape of GET /warehouses/tree: a row plus nested children. */
export interface BackendWarehouseTreeNode extends BackendWarehouse {
  children: Array<BackendWarehouseTreeNode>
}

const TYPE_VALUES: Record<WarehouseType, BackendWarehouseType> = {
  central: 'CENTRAL',
  regional: 'REGIONAL',
  'service-point': 'SERVICE_POINT',
}

const TYPE_RECORDS = Object.fromEntries(
  Object.entries(TYPE_VALUES).map(([record, value]) => [value, record]),
) as Record<BackendWarehouseType, WarehouseType>

/** Backend row → the console record (uppercase enums → console values). */
export function toWarehouseRecord(row: BackendWarehouse): WarehouseRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: TYPE_RECORDS[row.type],
    parentId: row.parentId,
    parentName: row.parentName,
    region: row.region,
    address: row.address,
    picName: row.picName,
    picContact: row.picContact ?? '',
    capacity: row.capacity,
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    terminalCount: row.terminalCount,
    createdAt: new Date(row.createdAt).toISOString().slice(0, 10),
  }
}

/** Maps a frontend type onto the backend's uppercase enum. */
export function toBackendType(type: WarehouseType): BackendWarehouseType {
  return TYPE_VALUES[type]
}

/** Maps a frontend status onto the backend's uppercase enum. */
export function toBackendStatus(
  status: WarehouseStatus,
): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/**
 * True when the error is the backend's 409 for a duplicate warehouse code.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateCodeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /warehouse code is already in use/i.test(error.message)
  )
}

export function warehouseError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage warehouses.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** Depth-first flatten; `parentId` already encodes the hierarchy. */
function flattenTree(
  nodes: Array<BackendWarehouseTreeNode>,
  into: Array<WarehouseRecord> = [],
): Array<WarehouseRecord> {
  for (const node of nodes) {
    into.push(toWarehouseRecord(node))
    flattenTree(node.children, into)
  }
  return into
}

/**
 * Fetches the full live hierarchy from GET /warehouses/tree (gated by the
 * warehouses-module "view" grant) and flattens it back to records — the
 * page's tree table, filters and pagination all derive from the flat
 * `parentId` list client-side, exactly as they did over the mock data
 * (matches away from the search never lose their ancestor context).
 * Cookie forwarding follows the same SSR reasoning as the users feature.
 */
const fetchWarehouseTree = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<WarehouseRecord>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendWarehouseTreeNode>>(
        'warehouses/tree',
        { headers: { cookie } },
      )
      return flattenTree(response.data)
    } catch (err: unknown) {
      throw warehouseError(err, 'Failed to load warehouses')
    }
  },
)

/** Base key shared by every warehouse query (tree, detail, parents). */
export const warehousesQueryKey = ['warehouses'] as const

export const warehouseTreeQueryKey = [...warehousesQueryKey, 'tree'] as const

export const warehouseTreeQueryOptions = () =>
  queryOptions({
    queryKey: warehouseTreeQueryKey,
    queryFn: () => fetchWarehouseTree(),
    staleTime: 30_000,
  })
