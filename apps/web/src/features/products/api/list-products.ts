import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  ProductCategory,
  ProductRecord,
  ProductStatus,
} from '../data/products.ts'

/** Backend enum values (display labels stay title-case in the console). */
export type BackendProductCategory =
  'MOBILE_EDC' | 'COUNTERTOP' | 'MPOS' | 'PRINTER'

/** Row shape returned by the backend's /products list endpoint. */
export interface BackendProduct {
  id: string
  modelName: string
  brand: string
  category: BackendProductCategory
  description: string | null
  photoUrl: string | null
  status: 'ACTIVE' | 'INACTIVE'
  /** Terminals registered with this model (0 until Terminals lands). */
  terminalCount: number
  /** Rows in the standard completeness list. */
  completenessItemCount: number
  createdAt: string
  updatedAt: string
}

const CATEGORY_LABELS: Record<BackendProductCategory, ProductCategory> = {
  MOBILE_EDC: 'Mobile EDC',
  COUNTERTOP: 'Countertop',
  MPOS: 'mPOS',
  PRINTER: 'Printer',
}

const CATEGORY_VALUES = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([value, label]) => [label, value]),
) as Record<ProductCategory, BackendProductCategory>

/** Backend row → the console record (uppercase enums → display labels). */
export function toProductRecord(row: BackendProduct): ProductRecord {
  return {
    id: row.id,
    modelName: row.modelName,
    brand: row.brand,
    category: CATEGORY_LABELS[row.category],
    description: row.description ?? '',
    photoUrl: row.photoUrl ?? '',
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    terminalCount: row.terminalCount,
    completenessItemCount: row.completenessItemCount,
    createdAt: new Date(row.createdAt).toISOString().slice(0, 10),
  }
}

/** Maps a frontend category label onto the backend's uppercase enum. */
export function toBackendCategory(
  category: ProductCategory,
): BackendProductCategory {
  return CATEGORY_VALUES[category]
}

/** Maps a frontend status onto the backend's uppercase enum. */
export function toBackendStatus(status: ProductStatus): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/**
 * True when the error is the backend's 409 for a duplicate model name.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateModelNameError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /model name is already in use/i.test(error.message)
  )
}

export function productError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(detail || 'You do not have permission to manage products.')
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the product list plus the filtered total row count. */
export interface ProductsListPage {
  products: Array<ProductRecord>
  total: number
}

export interface ProductsQueryFilters {
  search?: string
  category?: ProductCategory | 'all'
  status?: ProductStatus | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of products from GET /products (gated by the
 * products-module "view" grant). Search, category/status filters and
 * pagination all happen server-side; the response carries the page rows
 * plus the total count matching the filters. Cookies are forwarded
 * manually for the same SSR reason as the users feature (they are
 * httpOnly).
 */
const fetchProducts = createServerFn({ method: 'GET' })
  .validator((input: ProductsQueryFilters) => input)
  .handler(async ({ data }): Promise<ProductsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { products: [], total: 0 }

    try {
      const response = await apiClient.get<{
        products: Array<BackendProduct>
        total: number
      }>('products', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.category && data.category !== 'all'
            ? { category: toBackendCategory(data.category) }
            : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        products: response.data.products.map(toProductRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw productError(err, 'Failed to load products')
    }
  })

/** Base key shared by every product query (list, detail). */
export const productsQueryKey = ['products'] as const

export const productsListQueryKey = [...productsQueryKey, 'list'] as const

export const productsListQueryOptions = ({
  search = '',
  category = 'all',
  status = 'all',
  page = 1,
  pageSize = 50,
}: ProductsQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...productsListQueryKey,
      search.trim(),
      category,
      status,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchProducts({ data: { search, category, status, page, pageSize } }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
