import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import {
  servicePointError,
  servicePointsQueryKey,
  toServicePointRecord,
} from './service-point-tree.ts'
import type { BackendServicePoint } from './service-point-tree.ts'
import type {
  ServicePointRecord,
  ServicePointStatus,
} from '../data/service-points.ts'

/** One page of the flat service point list plus the filtered total. */
export interface ServicePointsListPage {
  servicePoints: Array<ServicePointRecord>
  total: number
}

export interface ServicePointsListFilters {
  search?: string
  status?: ServicePointStatus | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of the flat list from GET /service-points (server-side
 * search/status filters and pagination). The tree page derives everything
 * from the tree query instead; this list serves flows that want a flat,
 * paginated catalogue — e.g. the assignment drawer.
 */
const fetchServicePoints = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      search?: string
      status?: string
      page?: number
      pageSize?: number
    }) => ({
      search: typeof input.search === 'string' ? input.search.trim() : '',
      status:
        input.status === 'active' || input.status === 'inactive'
          ? input.status
          : '',
      page: typeof input.page === 'number' ? input.page : 1,
      pageSize: typeof input.pageSize === 'number' ? input.pageSize : 50,
    }),
  )
  .handler(async ({ data }): Promise<ServicePointsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { servicePoints: [], total: 0 }

    try {
      const response = await apiClient.get<{
        servicePoints: Array<BackendServicePoint>
        total: number
      }>('service-points', {
        headers: { cookie },
        params: {
          ...(data.search ? { search: data.search } : undefined),
          ...(data.status ? { status: data.status.toUpperCase() } : undefined),
          page: data.page,
          pageSize: data.pageSize,
        },
      })
      return {
        servicePoints: response.data.servicePoints.map(toServicePointRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw servicePointError(err, 'Failed to load service points')
    }
  })

export const servicePointsListQueryKey = [
  ...servicePointsQueryKey,
  'list',
] as const

export const servicePointsListQueryOptions = ({
  search = '',
  status = 'all',
  page = 1,
  pageSize = 50,
}: ServicePointsListFilters = {}) =>
  queryOptions({
    queryKey: [
      ...servicePointsListQueryKey,
      search.trim(),
      status,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchServicePoints({
        data: {
          search,
          status: status === 'all' ? '' : status,
          page,
          pageSize,
        },
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
