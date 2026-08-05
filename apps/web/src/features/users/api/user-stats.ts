import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient, type ApiError } from '#/lib/api-client.ts'

/** Whole-table counts from GET /users/stats — unaffected by search/filter. */
export interface UserStats {
  total: number
  active: number
  admins: number
}

const EMPTY_STATS: UserStats = { total: 0, active: 0, admins: 0 }

const fetchUserStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserStats> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return EMPTY_STATS

    try {
      const response = await apiClient.get<UserStats>('users/stats', {
        headers: { cookie },
      })
      return response.data
    } catch (err: unknown) {
      const apiErr = err as ApiError
      const status = apiErr?.status ?? 500
      throw new Error(
        apiErr?.message || `Failed to load user stats (HTTP ${status}).`,
      )
    }
  },
)

export const userStatsQueryKey = ['users', 'stats'] as const

export const userStatsQueryOptions = () =>
  queryOptions({
    queryKey: userStatsQueryKey,
    queryFn: () => fetchUserStats(),
    staleTime: 30_000,
  })
