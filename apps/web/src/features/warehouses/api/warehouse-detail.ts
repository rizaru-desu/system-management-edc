import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import {
  toWarehouseRecord,
  warehouseError,
  warehousesQueryKey,
} from './warehouse-tree.ts'
import type { BackendWarehouse } from './warehouse-tree.ts'
import type { WarehouseRecord } from '../data/warehouses.ts'

/** GET /warehouses/:id payload in console shape. */
export interface WarehouseDetail {
  warehouse: WarehouseRecord
  parent: WarehouseRecord | null
  /** Direct children only (not grandchildren). */
  children: Array<WarehouseRecord>
}

/**
 * Fetches one warehouse plus its parent and direct children from GET
 * /warehouses/:id. A 404 resolves to null so the page can render its
 * not-found state instead of the error card.
 */
const fetchWarehouseDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<WarehouseDetail | null> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    try {
      const response = await apiClient.get<{
        warehouse: BackendWarehouse
        parent: BackendWarehouse | null
        children: Array<BackendWarehouse>
      }>(`warehouses/${encodeURIComponent(data.id)}`, {
        headers: { cookie },
      })
      return {
        warehouse: toWarehouseRecord(response.data.warehouse),
        parent: response.data.parent
          ? toWarehouseRecord(response.data.parent)
          : null,
        children: response.data.children.map(toWarehouseRecord),
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null
      throw warehouseError(err, 'Failed to load the warehouse')
    }
  })

export const warehouseDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...warehousesQueryKey, 'detail', id],
    queryFn: () => fetchWarehouseDetail({ data: { id } }),
    staleTime: 30_000,
  })
