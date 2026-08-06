import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import {
  merchantError,
  merchantsQueryKey,
  toMerchantRecord,
} from './list-merchants.ts'
import type { BackendMerchant } from './list-merchants.ts'
import type { MerchantRecord } from '../data/merchants.ts'

/**
 * Fetches a single merchant from GET /merchants/:id (gated by the
 * merchants-module "view" grant) — the view dialog re-reads through this so
 * it always shows fresh data even when the cached list is stale.
 */
const fetchMerchantDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MerchantRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.get<BackendMerchant>(
        `merchants/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return toMerchantRecord(response.data)
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to load the merchant')
    }
  })

export const merchantDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...merchantsQueryKey, 'detail', id],
    queryFn: () => fetchMerchantDetail({ data: { id } }),
    staleTime: 30_000,
  })
