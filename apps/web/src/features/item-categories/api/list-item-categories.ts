import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  AccessoryCategory,
  ItemCategoryRecord,
  ItemCategoryStatus,
  ItemUnit,
} from '../data/item-categories.ts'

/** Backend enum values (display labels stay title-case in the console). */
export type BackendAccessoryCategory =
  'POWER' | 'KONEKTIVITAS' | 'DOKUMEN' | 'KEMASAN' | 'AKSESORIS_LAIN'

export type BackendItemUnit = 'PCS' | 'SET' | 'UNIT' | 'ROLL'

/** Row shape returned by the backend's /item-categories endpoints. */
export interface BackendItemCategory {
  id: string
  name: string
  code: string | null
  accessoryCategory: BackendAccessoryCategory
  unit: BackendItemUnit
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  /** Products referencing this item (0 until the Products module lands). */
  productUsageCount: number
  createdAt: string
  updatedAt: string
}

const CATEGORY_LABELS: Record<BackendAccessoryCategory, AccessoryCategory> = {
  POWER: 'Power',
  KONEKTIVITAS: 'Konektivitas',
  DOKUMEN: 'Dokumen',
  KEMASAN: 'Kemasan',
  AKSESORIS_LAIN: 'Aksesoris Lain',
}

const CATEGORY_VALUES = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([value, label]) => [label, value]),
) as Record<AccessoryCategory, BackendAccessoryCategory>

const UNIT_LABELS: Record<BackendItemUnit, ItemUnit> = {
  PCS: 'Pcs',
  SET: 'Set',
  UNIT: 'Unit',
  ROLL: 'Roll',
}

const UNIT_VALUES = Object.fromEntries(
  Object.entries(UNIT_LABELS).map(([value, label]) => [label, value]),
) as Record<ItemUnit, BackendItemUnit>

/** Backend row → the console record (uppercase enums → display labels). */
export function toItemCategoryRecord(
  row: BackendItemCategory,
): ItemCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? '',
    category: CATEGORY_LABELS[row.accessoryCategory],
    unit: UNIT_LABELS[row.unit],
    description: row.description ?? '',
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    productUsageCount: row.productUsageCount,
    createdAt: row.createdAt,
  }
}

/** Maps a frontend category label onto the backend's uppercase enum. */
export function toBackendCategory(
  category: AccessoryCategory,
): BackendAccessoryCategory {
  return CATEGORY_VALUES[category]
}

/** Maps a frontend unit label onto the backend's uppercase enum. */
export function toBackendUnit(unit: ItemUnit): BackendItemUnit {
  return UNIT_VALUES[unit]
}

/** Maps a frontend status onto the backend's uppercase enum. */
export function toBackendStatus(
  status: ItemCategoryStatus,
): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/**
 * True when the error is the backend's 409 for a duplicate item name.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateNameError(error: unknown): boolean {
  return (
    error instanceof Error && /item name is already in use/i.test(error.message)
  )
}

/** True when the error is the backend's 409 for a duplicate item code. */
export function isDuplicateCodeError(error: unknown): boolean {
  return (
    error instanceof Error && /item code is already in use/i.test(error.message)
  )
}

export function itemCategoryError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage item categories.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the item list plus the filtered total row count. */
export interface ItemCategoriesListPage {
  itemCategories: Array<ItemCategoryRecord>
  total: number
}

export interface ItemCategoriesQueryFilters {
  search?: string
  category?: AccessoryCategory | 'all'
  status?: ItemCategoryStatus | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of item categories from GET /item-categories (gated by
 * the item-categories-module "view" grant). Search, category/status filters
 * and pagination all happen server-side; the response carries the page rows
 * plus the total count matching the filters. Cookies are forwarded manually
 * for the same SSR reason as the users feature (they are httpOnly).
 */
const fetchItemCategories = createServerFn({ method: 'GET' })
  .validator((input: ItemCategoriesQueryFilters) => input)
  .handler(async ({ data }): Promise<ItemCategoriesListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { itemCategories: [], total: 0 }

    try {
      const response = await apiClient.get<{
        itemCategories: Array<BackendItemCategory>
        total: number
      }>('item-categories', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.category && data.category !== 'all'
            ? { accessoryCategory: toBackendCategory(data.category) }
            : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        itemCategories: response.data.itemCategories.map(toItemCategoryRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw itemCategoryError(err, 'Failed to load item categories')
    }
  })

/** Base key shared by every item category query (list, detail). */
export const itemCategoriesQueryKey = ['item-categories'] as const

export const itemCategoriesListQueryKey = [
  ...itemCategoriesQueryKey,
  'list',
] as const

export const itemCategoriesListQueryOptions = ({
  search = '',
  category = 'all',
  status = 'all',
  page = 1,
  pageSize = 50,
}: ItemCategoriesQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...itemCategoriesListQueryKey,
      search.trim(),
      category,
      status,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchItemCategories({
        data: { search, category, status, page, pageSize },
      }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
