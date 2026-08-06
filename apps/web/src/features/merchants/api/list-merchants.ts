import { queryOptions } from '@tanstack/react-query'

import { fetchMerchants } from './mock-backend.ts'

export const merchantsQueryKey = ['merchants'] as const

/**
 * The full merchant catalogue — search, filters, sorting and pagination all
 * run client-side on the page (this module is UI-only for now). Swapping in
 * the backend later only changes the queryFn (and optionally moves the
 * filters server-side like the app-releases list).
 */
export const merchantsQueryOptions = () =>
  queryOptions({
    queryKey: merchantsQueryKey,
    queryFn: () => fetchMerchants(),
  })
