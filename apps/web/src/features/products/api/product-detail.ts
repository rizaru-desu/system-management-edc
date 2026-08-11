import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import {
  productError,
  productsQueryKey,
  toProductRecord,
} from './list-products.ts'
import type { BackendProduct } from './list-products.ts'
import type {
  ProductCompletenessItemRecord,
  ProductDetail,
} from '../data/products.ts'

/** One completeness row as served by GET /products/:id (item data joined). */
export interface BackendCompletenessItem {
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  itemUnit: string
  required: boolean
  standardQty: number
}

/** Detail shape of GET /products/:id: the row plus its completeness list. */
export interface BackendProductDetail extends BackendProduct {
  completenessItems: Array<BackendCompletenessItem>
}

function toCompletenessItemRecord(
  row: BackendCompletenessItem,
): ProductCompletenessItemRecord {
  return {
    itemCategoryId: row.itemCategoryId,
    itemName: row.itemName,
    itemCode: row.itemCode ?? '',
    itemUnit: row.itemUnit,
    required: row.required,
    standardQty: row.standardQty,
  }
}

export function toProductDetail(row: BackendProductDetail): ProductDetail {
  return {
    ...toProductRecord(row),
    completenessItems: row.completenessItems.map(toCompletenessItemRecord),
  }
}

/**
 * Fetches one product with its full standard completeness list from GET
 * /products/:id. A 404 resolves to null so the page can render its
 * not-found state instead of the error card.
 */
const fetchProductDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ProductDetail | null> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    try {
      const response = await apiClient.get<BackendProductDetail>(
        `products/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return toProductDetail(response.data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null
      throw productError(err, 'Failed to load the product')
    }
  })

export const productDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...productsQueryKey, 'detail', id],
    queryFn: () => fetchProductDetail({ data: { id } }),
    staleTime: 30_000,
  })
