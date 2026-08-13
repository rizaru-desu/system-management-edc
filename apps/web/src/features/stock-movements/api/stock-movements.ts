import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  EdcMovementRecord,
  EdcMovementType,
  PeripheralMovementReason,
  PeripheralMovementRecord,
} from '../data/stock-movements.ts'

/** Backend enum values (console values stay kebab-case). */
export type BackendEdcMovementType =
  | 'INBOUND_RECEIPT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'INSTALLATION'
  | 'MARKED_DAMAGED'
  | 'MAINTENANCE'
  | 'RETURNED_TO_STOCK'
  | 'RETIRED'
  | 'STATUS_CHANGE'

export type BackendPeripheralReason =
  'INBOUND_RECEIPT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT'

const EDC_TYPE_RECORDS: Record<BackendEdcMovementType, EdcMovementType> = {
  INBOUND_RECEIPT: 'inbound-receipt',
  TRANSFER_OUT: 'transfer-out',
  TRANSFER_IN: 'transfer-in',
  INSTALLATION: 'installation',
  MARKED_DAMAGED: 'marked-damaged',
  MAINTENANCE: 'maintenance',
  RETURNED_TO_STOCK: 'returned-to-stock',
  RETIRED: 'retired',
  // The backend's catch-all for unmapped transitions; the console folds it
  // into the closest neutral bucket.
  STATUS_CHANGE: 'returned-to-stock',
}

const EDC_TYPE_VALUES: Record<EdcMovementType, BackendEdcMovementType> = {
  'inbound-receipt': 'INBOUND_RECEIPT',
  'transfer-out': 'TRANSFER_OUT',
  'transfer-in': 'TRANSFER_IN',
  installation: 'INSTALLATION',
  'marked-damaged': 'MARKED_DAMAGED',
  maintenance: 'MAINTENANCE',
  'returned-to-stock': 'RETURNED_TO_STOCK',
  retired: 'RETIRED',
}

const REASON_RECORDS: Record<
  BackendPeripheralReason,
  PeripheralMovementReason
> = {
  INBOUND_RECEIPT: 'inbound-receipt',
  TRANSFER_IN: 'transfer-in',
  TRANSFER_OUT: 'transfer-out',
  ADJUSTMENT: 'adjustment',
}

const REASON_VALUES = {
  'inbound-receipt': 'INBOUND_RECEIPT',
  'transfer-in': 'TRANSFER_IN',
  'transfer-out': 'TRANSFER_OUT',
  adjustment: 'ADJUSTMENT',
} satisfies Record<PeripheralMovementReason, BackendPeripheralReason>

/** ISO timestamp → the console's yyyy-mm-dd HH:mm display stamp (UTC). */
function toDisplayStamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ')
}

interface BackendEdcMovement {
  id: string
  movedAt: string
  serialNumber: string
  productModelName: string
  fromWarehouseName: string | null
  toWarehouseName: string | null
  movementType: BackendEdcMovementType
  changedByName: string | null
  notes: string | null
}

interface BackendPeripheralMovement {
  id: string
  movedAt: string
  itemName: string
  itemCode: string | null
  warehouseName: string
  quantityChange: number
  reason: BackendPeripheralReason
  relatedShipmentDoNumber: string | null
  notes: string | null
}

export function movementError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to view stock movements.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** Shared filter shape of both movement queries. */
export interface MovementQueryFilters {
  search?: string
  warehouseId?: string | 'all'
  /** Console movement type / reason; 'all' skips the filter. */
  type?: string
  dateFrom?: string
  dateTo?: string
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

function toParams(filters: MovementQueryFilters) {
  return {
    ...(filters.search?.trim() ? { search: filters.search.trim() } : undefined),
    ...(filters.warehouseId && filters.warehouseId !== 'all'
      ? { warehouseId: filters.warehouseId }
      : undefined),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : undefined),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : undefined),
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
  }
}

/**
 * Fetches one page of the EDC movement log from GET /stock-movements
 * (gated by the stock-movements module's "view" grant). Search, filters
 * and pagination all run server-side; the movement type is derived from
 * each status transition by the backend. Cookies are forwarded manually
 * for the same SSR reason as the users feature.
 */
const fetchEdcMovements = createServerFn({ method: 'GET' })
  .validator((input: MovementQueryFilters) => input)
  .handler(
    async ({
      data,
    }): Promise<{ movements: Array<EdcMovementRecord>; total: number }> => {
      const cookie = getRequestHeader('cookie')
      if (!cookie) return { movements: [], total: 0 }

      try {
        const response = await apiClient.get<{
          movements: Array<BackendEdcMovement>
          total: number
        }>('stock-movements', {
          headers: { cookie },
          params: {
            ...toParams(data),
            ...(data.type && data.type !== 'all'
              ? {
                  movementType: EDC_TYPE_VALUES[data.type as EdcMovementType],
                }
              : undefined),
          },
        })
        return {
          movements: response.data.movements.map((row) => ({
            id: row.id,
            movedAt: toDisplayStamp(row.movedAt),
            serialNumber: row.serialNumber,
            productModelName: row.productModelName,
            fromWarehouseName: row.fromWarehouseName,
            toWarehouseName: row.toWarehouseName,
            movementType: EDC_TYPE_RECORDS[row.movementType],
            changedByName: row.changedByName,
            notes: row.notes ?? '',
          })),
          total: response.data.total,
        }
      } catch (err: unknown) {
        throw movementError(err, 'Failed to load the EDC movements')
      }
    },
  )

/** Same shape for the peripheral log (GET /stock-movements/peripherals). */
const fetchPeripheralMovements = createServerFn({ method: 'GET' })
  .validator((input: MovementQueryFilters) => input)
  .handler(
    async ({
      data,
    }): Promise<{
      movements: Array<PeripheralMovementRecord>
      total: number
    }> => {
      const cookie = getRequestHeader('cookie')
      if (!cookie) return { movements: [], total: 0 }

      try {
        const response = await apiClient.get<{
          movements: Array<BackendPeripheralMovement>
          total: number
        }>('stock-movements/peripherals', {
          headers: { cookie },
          params: {
            ...toParams(data),
            ...(data.type && data.type !== 'all'
              ? {
                  reason: REASON_VALUES[data.type as PeripheralMovementReason],
                }
              : undefined),
          },
        })
        return {
          movements: response.data.movements.map((row) => ({
            id: row.id,
            movedAt: toDisplayStamp(row.movedAt),
            itemName: row.itemName,
            itemCode: row.itemCode,
            warehouseName: row.warehouseName,
            quantityChange: row.quantityChange,
            reason: REASON_RECORDS[row.reason],
            notes: row.notes ?? '',
          })),
          total: response.data.total,
        }
      } catch (err: unknown) {
        throw movementError(err, 'Failed to load the peripheral movements')
      }
    },
  )

/** One entry of the warehouse filter dropdown (tree order, with depth). */
export interface MovementWarehouseOption {
  id: string
  name: string
  code: string
  type: string
  depth: number
}

const fetchWarehouseOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<MovementWarehouseOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<MovementWarehouseOption>>(
        'stock-movements/warehouse-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw movementError(err, 'Failed to load the warehouse options')
    }
  },
)

/** Base key shared by every stock-movements query. */
export const stockMovementsQueryKey = ['stock-movements'] as const

export const edcMovementsQueryOptions = (filters: MovementQueryFilters) =>
  queryOptions({
    queryKey: [
      ...stockMovementsQueryKey,
      'edc',
      filters.search?.trim() ?? '',
      filters.warehouseId ?? 'all',
      filters.type ?? 'all',
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
      filters.page ?? 1,
      filters.pageSize ?? 50,
    ],
    queryFn: () => fetchEdcMovements({ data: filters }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

export const peripheralMovementsQueryOptions = (
  filters: MovementQueryFilters,
) =>
  queryOptions({
    queryKey: [
      ...stockMovementsQueryKey,
      'peripherals',
      filters.search?.trim() ?? '',
      filters.warehouseId ?? 'all',
      filters.type ?? 'all',
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
      filters.page ?? 1,
      filters.pageSize ?? 50,
    ],
    queryFn: () => fetchPeripheralMovements({ data: filters }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

export const movementWarehouseOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...stockMovementsQueryKey, 'warehouse-options'],
    queryFn: () => fetchWarehouseOptions(),
    staleTime: 30_000,
  })
