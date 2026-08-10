import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import {
  toBackendType,
  warehouseError,
  warehousesQueryKey,
} from './warehouse-tree.ts'
import type { BackendWarehouse } from './warehouse-tree.ts'
import type { WarehouseType } from '../data/warehouses.ts'
import type { ParentOption } from '../lib/tree.ts'

interface EligibleParentsInput {
  type: WarehouseType
  /** The record being edited, so the list never offers itself. */
  excludeId: string | null
}

/**
 * Fetches the valid parent choices for a warehouse type from GET
 * /warehouses/eligible-parents — the backend applies the ladder (Regional →
 * Centrals, Service Point → Regionals) and the self-exclusion, so the form
 * dropdown just renders what it gets.
 */
const fetchEligibleParents = createServerFn({ method: 'GET' })
  .validator((input: EligibleParentsInput) => input)
  .handler(async ({ data }): Promise<Array<ParentOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendWarehouse>>(
        'warehouses/eligible-parents',
        {
          headers: { cookie },
          params: {
            type: toBackendType(data.type),
            ...(data.excludeId ? { excludeId: data.excludeId } : undefined),
          },
        },
      )
      return response.data.map((row) => ({
        id: row.id,
        label: `${row.name} (${row.code})`,
      }))
    } catch (err: unknown) {
      throw warehouseError(err, 'Failed to load parent warehouses')
    }
  })

export const eligibleParentsQueryOptions = (
  type: WarehouseType,
  excludeId: string | null,
) =>
  queryOptions({
    queryKey: [
      ...warehousesQueryKey,
      'eligible-parents',
      type,
      excludeId ?? '',
    ],
    queryFn: () => fetchEligibleParents({ data: { type, excludeId } }),
    staleTime: 30_000,
  })
