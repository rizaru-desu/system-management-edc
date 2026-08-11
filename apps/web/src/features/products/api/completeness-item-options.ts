import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { productError, productsQueryKey } from './list-products.ts'

/** One entry of the completeness dropdown (Item Categories master). */
export interface CompletenessItemOption {
  id: string
  name: string
  /** Item Category code (e.g. ACC-001); empty when unset. */
  code: string
  unit: string
}

/** Row shape of GET /products/completeness-item-options. */
interface BackendItemOption {
  id: string
  name: string
  code: string | null
  unit: string
}

/** Backend unit enums → the console's display labels. */
const UNIT_LABELS: Record<string, string> = {
  PCS: 'Pcs',
  SET: 'Set',
  UNIT: 'Unit',
  ROLL: 'Roll',
}

/**
 * Fetches the completeness-item choices from GET
 * /products/completeness-item-options — every live ACTIVE item category,
 * served by the products module so the editor works with the products
 * grant alone (no item-categories module grant required). Cookie
 * forwarding follows the same SSR reasoning as the users feature.
 */
const fetchCompletenessItemOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<CompletenessItemOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendItemOption>>(
        'products/completeness-item-options',
        { headers: { cookie } },
      )
      return response.data.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code ?? '',
        unit: UNIT_LABELS[row.unit] ?? row.unit,
      }))
    } catch (err: unknown) {
      throw productError(err, 'Failed to load the completeness items')
    }
  },
)

export const completenessItemOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...productsQueryKey, 'completeness-item-options'],
    queryFn: () => fetchCompletenessItemOptions(),
    staleTime: 30_000,
  })
