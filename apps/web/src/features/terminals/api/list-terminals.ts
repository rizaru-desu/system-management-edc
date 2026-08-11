import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  TerminalCondition,
  TerminalRecord,
  TerminalStatus,
  TerminalWarehouseType,
} from '../data/terminals.ts'

/** Backend enum values (display labels stay title-case in the console). */
export type BackendTerminalStatus =
  | 'IN_STOCK'
  | 'IN_TRANSIT'
  | 'INSTALLED'
  | 'UNDER_MAINTENANCE'
  | 'DAMAGED'
  | 'RETIRED'

export type BackendTerminalCondition = 'NEW' | 'REFURBISHED'

/** Row shape returned by the backend's /terminals endpoints. */
export interface BackendTerminal {
  id: string
  serialNumber: string
  productId: string
  productModelName: string
  productBrand: string
  warehouseId: string | null
  warehouseName: string | null
  warehouseType: 'CENTRAL' | 'REGIONAL' | 'SERVICE_POINT' | null
  status: BackendTerminalStatus
  condition: BackendTerminalCondition
  merchantId: string | null
  merchantName: string | null
  notes: string | null
  enteredSystemAt: string
  createdAt: string
  updatedAt: string
}

const STATUS_RECORDS: Record<BackendTerminalStatus, TerminalStatus> = {
  IN_STOCK: 'in-stock',
  IN_TRANSIT: 'in-transit',
  INSTALLED: 'installed',
  UNDER_MAINTENANCE: 'under-maintenance',
  DAMAGED: 'damaged',
  RETIRED: 'retired',
}

const STATUS_VALUES = Object.fromEntries(
  Object.entries(STATUS_RECORDS).map(([value, record]) => [record, value]),
) as Record<TerminalStatus, BackendTerminalStatus>

const WAREHOUSE_TYPE_RECORDS: Record<string, TerminalWarehouseType> = {
  CENTRAL: 'central',
  REGIONAL: 'regional',
  SERVICE_POINT: 'service-point',
}

/** Backend row → the console record (uppercase enums → console values). */
export function toTerminalRecord(row: BackendTerminal): TerminalRecord {
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    productId: row.productId,
    productModelName: row.productModelName,
    productBrand: row.productBrand,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouseName,
    warehouseType: row.warehouseType
      ? WAREHOUSE_TYPE_RECORDS[row.warehouseType]
      : null,
    status: STATUS_RECORDS[row.status],
    condition: row.condition === 'NEW' ? 'new' : 'refurbished',
    merchantId: row.merchantId,
    merchantName: row.merchantName ?? '',
    entryDate: row.enteredSystemAt,
    notes: row.notes ?? '',
  }
}

/** Maps a frontend status onto the backend's uppercase enum. */
export function toBackendStatus(status: TerminalStatus): BackendTerminalStatus {
  return STATUS_VALUES[status]
}

/** Maps a frontend condition onto the backend's uppercase enum. */
export function toBackendCondition(
  condition: TerminalCondition,
): BackendTerminalCondition {
  return condition === 'new' ? 'NEW' : 'REFURBISHED'
}

/**
 * True when the error is the backend's 409 for a duplicate serial number.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateSerialError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /serial number is already in use/i.test(error.message)
  )
}

export function terminalError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage terminals.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the terminal list plus the filtered total row count. */
export interface TerminalsListPage {
  terminals: Array<TerminalRecord>
  total: number
}

export interface TerminalsQueryFilters {
  search?: string
  status?: TerminalStatus | 'all'
  warehouseId?: string | 'all'
  productId?: string | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of terminals from GET /terminals (gated by the
 * terminals-module "view" grant). Search, status/warehouse/product filters
 * and pagination all happen server-side; product, warehouse and merchant
 * display fields come joined in the same response (no N+1). Cookies are
 * forwarded manually for the same SSR reason as the users feature.
 */
const fetchTerminals = createServerFn({ method: 'GET' })
  .validator((input: TerminalsQueryFilters) => input)
  .handler(async ({ data }): Promise<TerminalsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { terminals: [], total: 0 }

    try {
      const response = await apiClient.get<{
        terminals: Array<BackendTerminal>
        total: number
      }>('terminals', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          ...(data.warehouseId && data.warehouseId !== 'all'
            ? { warehouseId: data.warehouseId }
            : undefined),
          ...(data.productId && data.productId !== 'all'
            ? { productId: data.productId }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        terminals: response.data.terminals.map(toTerminalRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to load terminals')
    }
  })

/** Base key shared by every terminal query (list, detail, options). */
export const terminalsQueryKey = ['terminals'] as const

export const terminalsListQueryKey = [...terminalsQueryKey, 'list'] as const

export const terminalsListQueryOptions = ({
  search = '',
  status = 'all',
  warehouseId = 'all',
  productId = 'all',
  page = 1,
  pageSize = 50,
}: TerminalsQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...terminalsListQueryKey,
      search.trim(),
      status,
      warehouseId,
      productId,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchTerminals({
        data: { search, status, warehouseId, productId, page, pageSize },
      }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
