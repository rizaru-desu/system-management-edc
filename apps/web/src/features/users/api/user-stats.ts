import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'

/** One day of the console-activity series behind the Active Users sparkline. */
export interface UserActivityPoint {
  /** UTC day, yyyy-mm-dd. */
  date: string
  /** Distinct users with session activity that day. */
  value: number
}

/** Whole-table counts from GET /users/stats — unaffected by search/filter. */
export interface UserStats {
  total: number
  active: number
  admins: number
  /** Daily active users for the last 7 days (oldest first, zero-filled). */
  activeSeries: Array<UserActivityPoint>
  /** Current vs previous 7-day activity as a rounded percent; null when the
   * previous window had no activity to compare against. */
  activeTrendPercent: number | null
}

const EMPTY_STATS: UserStats = {
  total: 0,
  active: 0,
  admins: 0,
  activeSeries: [],
  activeTrendPercent: null,
}

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
      const apiErr = err instanceof ApiError ? err : null
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
