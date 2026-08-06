import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import {
  servicePointError,
  servicePointsQueryKey,
  toServicePointRecord,
} from './service-point-tree.ts'
import type { BackendServicePoint } from './service-point-tree.ts'
import type { ServicePointRecord } from '../data/service-points.ts'

/**
 * Fetches one service point from GET /service-points/:id — the view dialog
 * re-reads the record on open so it always shows fresh data even when the
 * cached tree is stale.
 */
const fetchServicePoint = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ServicePointRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.get<BackendServicePoint>(
        `service-points/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return toServicePointRecord(response.data)
    } catch (err: unknown) {
      throw servicePointError(err, 'Failed to load the service point')
    }
  })

export const servicePointDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...servicePointsQueryKey, 'detail', id],
    queryFn: () => fetchServicePoint({ data: { id } }),
    staleTime: 30_000,
  })
