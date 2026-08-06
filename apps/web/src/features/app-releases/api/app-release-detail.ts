import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import {
  appReleaseError,
  appReleasesQueryKey,
  toAppReleaseRecord,
} from './list-app-releases.ts'
import type { BackendAppRelease } from './list-app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

/**
 * Fetches a single release from GET /app-releases/:id (gated by the
 * app-releases-module "view" grant) — the detail dialog re-reads the record
 * so it always shows fresh data even when the cached list is stale.
 */
const fetchAppReleaseDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<AppReleaseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.get<BackendAppRelease>(
        `app-releases/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return toAppReleaseRecord(response.data)
    } catch (err: unknown) {
      throw appReleaseError(err, 'Failed to load the release')
    }
  })

export const appReleaseDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...appReleasesQueryKey, 'detail', id],
    queryFn: () => fetchAppReleaseDetail({ data: { id } }),
    staleTime: 30_000,
  })
