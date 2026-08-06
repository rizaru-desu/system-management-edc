import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type { MerchantRecord, MerchantStatus } from '../data/merchants.ts'

/** Row shape returned by the backend's /merchants endpoints. */
export interface BackendMerchant {
  id: string
  merchantCode: string
  merchantName: string
  merchantType: string | null
  picName: string | null
  phoneNumber: string | null
  email: string | null
  address: string | null
  province: string | null
  city: string | null
  district: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  servicePointId: string
  servicePointCode: string
  servicePointName: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

/** Backend row → the console record (DB column names → console names). */
export function toMerchantRecord(row: BackendMerchant): MerchantRecord {
  return {
    id: row.id,
    code: row.merchantCode,
    name: row.merchantName,
    type: row.merchantType,
    picName: row.picName,
    phone: row.phoneNumber,
    email: row.email,
    address: row.address,
    province: row.province,
    city: row.city,
    district: row.district,
    postalCode: row.postalCode,
    latitude: row.latitude,
    longitude: row.longitude,
    servicePointId: row.servicePointId,
    servicePointName: row.servicePointName,
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Maps a frontend status filter/value onto the backend's uppercase enum. */
export function toBackendStatus(status: MerchantStatus): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/**
 * True when the error is the backend's 409 for a duplicate merchant code.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateCodeError(error: unknown): boolean {
  return error instanceof Error && /already in use/i.test(error.message)
}

export function merchantError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage merchants.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** Sort columns the backend list endpoint accepts. */
export type MerchantSortField =
  | 'merchantCode'
  | 'merchantName'
  | 'merchantType'
  | 'picName'
  | 'phoneNumber'
  | 'status'
  | 'createdAt'

/** One page of the merchant list plus the filtered total row count. */
export interface MerchantsListPage {
  merchants: Array<MerchantRecord>
  total: number
}

export interface MerchantsQueryFilters {
  search?: string
  status?: MerchantStatus | 'all'
  servicePointId?: string | 'all'
  sortBy?: MerchantSortField
  sortOrder?: 'asc' | 'desc'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of merchants from GET /merchants (gated by the
 * merchants-module "view" grant). Search, status/service point filters,
 * sorting and pagination all happen server-side; the response carries the
 * page rows plus the total count matching the filters. Cookies are
 * forwarded manually for the same SSR reason as the users feature (they
 * are httpOnly).
 */
const fetchMerchants = createServerFn({ method: 'GET' })
  .validator((input: MerchantsQueryFilters) => input)
  .handler(async ({ data }): Promise<MerchantsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { merchants: [], total: 0 }

    try {
      const response = await apiClient.get<{
        merchants: Array<BackendMerchant>
        total: number
      }>('merchants', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          ...(data.servicePointId && data.servicePointId !== 'all'
            ? { servicePointId: data.servicePointId }
            : undefined),
          ...(data.sortBy
            ? { sortBy: data.sortBy, sortOrder: data.sortOrder ?? 'asc' }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        merchants: response.data.merchants.map(toMerchantRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to load merchants')
    }
  })

/** Base key shared by every merchant query (list, detail). */
export const merchantsQueryKey = ['merchants'] as const

export const merchantsListQueryKey = [...merchantsQueryKey, 'list'] as const

export const merchantsListQueryOptions = ({
  search = '',
  status = 'all',
  servicePointId = 'all',
  sortBy,
  sortOrder = 'asc',
  page = 1,
  pageSize = 50,
}: MerchantsQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...merchantsListQueryKey,
      search.trim(),
      status,
      servicePointId,
      sortBy ?? 'none',
      sortOrder,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchMerchants({
        data: {
          search,
          status,
          servicePointId,
          sortBy,
          sortOrder,
          page,
          pageSize,
        },
      }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
