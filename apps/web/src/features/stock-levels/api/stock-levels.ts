import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  EdcStockRecord,
  PeripheralStockRecord,
  StockSummary,
  StockWarehouse,
  StockWarehouseType,
} from '../data/stock-levels.ts'

const WAREHOUSE_TYPE_RECORDS: Record<string, StockWarehouseType> = {
  CENTRAL: 'central',
  REGIONAL: 'regional',
  SERVICE_POINT: 'service-point',
}

const WAREHOUSE_TYPE_VALUES: Record<StockWarehouseType, string> = {
  central: 'CENTRAL',
  regional: 'REGIONAL',
  'service-point': 'SERVICE_POINT',
}

export function stockError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to view stock levels.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

export interface StockLevelQueryFilters {
  warehouseId?: string | 'all'
  warehouseType?: StockWarehouseType | 'all'
  productId?: string | 'all'
  itemCategoryId?: string | 'all'
}

function toParams(filters: StockLevelQueryFilters) {
  return {
    ...(filters.warehouseId && filters.warehouseId !== 'all'
      ? { warehouseId: filters.warehouseId }
      : undefined),
    ...(filters.warehouseType && filters.warehouseType !== 'all'
      ? { warehouseType: WAREHOUSE_TYPE_VALUES[filters.warehouseType] }
      : undefined),
    ...(filters.productId && filters.productId !== 'all'
      ? { productId: filters.productId }
      : undefined),
    ...(filters.itemCategoryId && filters.itemCategoryId !== 'all'
      ? { itemCategoryId: filters.itemCategoryId }
      : undefined),
  }
}

interface BackendSummary {
  totalEdcInStock: number
  edcByWarehouseType: {
    CENTRAL: number
    REGIONAL: number
    SERVICE_POINT: number
  }
  peripheralLineCount: number
  peripheralQuantity: number
  lowStockLineCount: number
  lowStockThreshold: number
}

interface BackendEdcLevel {
  warehouseId: string
  warehouseName: string
  warehouseType: string
  warehouseParentId: string | null
  productId: string
  productModelName: string
  productBrand: string
  quantity: number
}

interface BackendPeripheralLevel {
  warehouseId: string
  warehouseName: string
  warehouseType: string
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  itemUnit: string
  quantity: number
}

/** One warehouse of the hierarchy dropdown/tree (tree order). */
export interface StockLevelWarehouseOption {
  id: string
  name: string
  code: string
  type: string
  parentId: string | null
  depth: number
}

/**
 * The Stock Levels reads, all through the stock-levels module (gated by
 * the sidebar module key "stock"). Cookies are forwarded manually for the
 * same SSR reason as the users feature.
 */
const fetchSummary = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StockSummary> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) {
      return {
        totalEdcInStock: 0,
        edcByWarehouseType: { central: 0, regional: 0, 'service-point': 0 },
        peripheralLineCount: 0,
        peripheralQuantity: 0,
        lowStockLineCount: 0,
      }
    }

    try {
      const response = await apiClient.get<BackendSummary>(
        'stock-levels/summary',
        { headers: { cookie } },
      )
      const data = response.data
      return {
        totalEdcInStock: data.totalEdcInStock,
        edcByWarehouseType: {
          central: data.edcByWarehouseType.CENTRAL,
          regional: data.edcByWarehouseType.REGIONAL,
          'service-point': data.edcByWarehouseType.SERVICE_POINT,
        },
        peripheralLineCount: data.peripheralLineCount,
        peripheralQuantity: data.peripheralQuantity,
        lowStockLineCount: data.lowStockLineCount,
      }
    } catch (err: unknown) {
      throw stockError(err, 'Failed to load the stock summary')
    }
  },
)

const fetchEdcLevels = createServerFn({ method: 'GET' })
  .validator((input: StockLevelQueryFilters) => input)
  .handler(async ({ data }): Promise<Array<EdcStockRecord>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendEdcLevel>>(
        'stock-levels/edc',
        { headers: { cookie }, params: toParams(data) },
      )
      return response.data.map((row) => ({
        warehouseId: row.warehouseId,
        productId: row.productId,
        productModelName: row.productModelName,
        productBrand: row.productBrand,
        quantity: row.quantity,
      }))
    } catch (err: unknown) {
      throw stockError(err, 'Failed to load the EDC stock levels')
    }
  })

const fetchPeripheralLevels = createServerFn({ method: 'GET' })
  .validator((input: StockLevelQueryFilters) => input)
  .handler(async ({ data }): Promise<Array<PeripheralStockRecord>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendPeripheralLevel>>(
        'stock-levels/peripherals',
        { headers: { cookie }, params: toParams(data) },
      )
      return response.data.map((row) => ({
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName,
        warehouseType: WAREHOUSE_TYPE_RECORDS[row.warehouseType] ?? 'central',
        itemCategoryId: row.itemCategoryId,
        itemName: row.itemName,
        itemCode: row.itemCode,
        // Backend units are uppercase (PCS/ROLL); title-case for display.
        itemUnit: row.itemUnit.charAt(0) + row.itemUnit.slice(1).toLowerCase(),
        quantity: row.quantity,
      }))
    } catch (err: unknown) {
      throw stockError(err, 'Failed to load the peripheral stock levels')
    }
  })

/**
 * The live warehouse hierarchy in tree order — depth for indentation and
 * parentId so the EDC table can rebuild its grouping.
 */
const fetchWarehouses = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<StockWarehouse>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<StockLevelWarehouseOption>>(
        'stock-levels/warehouse-options',
        { headers: { cookie } },
      )
      return response.data.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        type: WAREHOUSE_TYPE_RECORDS[row.type] ?? 'central',
        parentId: row.parentId,
        depth: row.depth,
      }))
    } catch (err: unknown) {
      throw stockError(err, 'Failed to load the warehouses')
    }
  },
)

/** One entry of the product / item filter dropdowns. */
export interface StockNamedOption {
  id: string
  name: string
}

const fetchProductOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<StockNamedOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<
        Array<{ id: string; modelName: string }>
      >('stock-levels/product-options', { headers: { cookie } })
      return response.data.map((row) => ({ id: row.id, name: row.modelName }))
    } catch (err: unknown) {
      throw stockError(err, 'Failed to load the product options')
    }
  },
)

const fetchItemOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<StockNamedOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<{ id: string; name: string }>>(
        'stock-levels/item-options',
        { headers: { cookie } },
      )
      return response.data.map((row) => ({ id: row.id, name: row.name }))
    } catch (err: unknown) {
      throw stockError(err, 'Failed to load the item options')
    }
  },
)

/** Base key shared by every stock-levels query. */
export const stockLevelsQueryKey = ['stock-levels'] as const

export const stockSummaryQueryOptions = () =>
  queryOptions({
    queryKey: [...stockLevelsQueryKey, 'summary'],
    queryFn: () => fetchSummary(),
    staleTime: 30_000,
  })

export const edcStockLevelsQueryOptions = (filters: StockLevelQueryFilters) =>
  queryOptions({
    queryKey: [
      ...stockLevelsQueryKey,
      'edc',
      filters.warehouseId ?? 'all',
      filters.warehouseType ?? 'all',
      filters.productId ?? 'all',
    ],
    queryFn: () => fetchEdcLevels({ data: filters }),
    staleTime: 30_000,
  })

export const peripheralStockLevelsQueryOptions = (
  filters: StockLevelQueryFilters,
) =>
  queryOptions({
    queryKey: [
      ...stockLevelsQueryKey,
      'peripherals',
      filters.warehouseId ?? 'all',
      filters.warehouseType ?? 'all',
      filters.itemCategoryId ?? 'all',
    ],
    queryFn: () => fetchPeripheralLevels({ data: filters }),
    staleTime: 30_000,
  })

export const stockWarehousesQueryOptions = () =>
  queryOptions({
    queryKey: [...stockLevelsQueryKey, 'warehouse-options'],
    queryFn: () => fetchWarehouses(),
    staleTime: 30_000,
  })

export const stockProductOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...stockLevelsQueryKey, 'product-options'],
    queryFn: () => fetchProductOptions(),
    staleTime: 30_000,
  })

export const stockItemOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...stockLevelsQueryKey, 'item-options'],
    queryFn: () => fetchItemOptions(),
    staleTime: 30_000,
  })
