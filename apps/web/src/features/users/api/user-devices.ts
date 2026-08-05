import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { apiClient, type ApiError } from '#/lib/api-client.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Types matching the backend response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceRecord {
  id: string
  deviceId: string
  platform: string
  brand: string | null
  manufacturer: string | null
  model: string | null
  androidVersion: string | null
  sdkVersion: string | null
  appVersion: string | null
  buildNumber: string | null
  carrier: string | null
  networkType: string | null
  isRooted: boolean
  isDeveloperMode: boolean
  isEmulator: boolean
  fcmToken: string | null
  status: string
  loginCount: number
  lastLoginAt: string | null
  lastLogoutAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginHistoryRecord {
  id: string
  deviceId: string
  platform: string | null
  brand: string | null
  model: string | null
  appVersion: string | null
  ipAddress: string | null
  userAgent: string | null
  loginAt: string
}

/** One event from the paginated history endpoint (`items[]`). */
export interface LoginHistoryEventRecord extends LoginHistoryRecord {
  eventType: 'login' | 'logout'
}

export interface LoginHistoryPage {
  items: Array<LoginHistoryEventRecord>
  total: number
  page: number
  limit: number
  hasNext: boolean
}

/** Server-side filters supported by the login history endpoint. */
export interface LoginHistoryFilters {
  search?: string
  /** ISO timestamps (inclusive range). */
  from?: string
  to?: string
  eventType?: 'login' | 'logout'
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface SessionRecord {
  id: string
  token: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Server functions (SSR-safe; forwards cookie for auth)
// ─────────────────────────────────────────────────────────────────────────────

const fetchUserDevices = createServerFn({ method: 'GET' })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<DeviceRecord[]> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []
    try {
      const res = await apiClient.get<{ success: boolean; data: DeviceRecord[] }>(
        `mobile/users/${data.userId}/devices`,
        { headers: { cookie } },
      )
      return res.data.data
    } catch (err: unknown) {
      const apiErr = err as ApiError
      throw new Error(apiErr?.message ?? 'Failed to load devices.')
    }
  })

const fetchUserLoginHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      userId: string
      page: number
      limit: number
    } & LoginHistoryFilters) => input,
  )
  .handler(async ({ data }): Promise<LoginHistoryPage> => {
    const { userId, page, limit, ...filters } = data
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { items: [], total: 0, page, limit, hasNext: false }
    try {
      const res = await apiClient.get<{ success: boolean } & LoginHistoryPage>(
        `mobile/users/${userId}/login-history`,
        {
          headers: { cookie },
          params: {
            page,
            limit,
            search: filters.search || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            eventType: filters.eventType || undefined,
            status: filters.status || undefined,
          },
        },
      )
      const { items, total, hasNext } = res.data
      return { items, total, page, limit, hasNext }
    } catch (err: unknown) {
      const apiErr = err as ApiError
      throw new Error(apiErr?.message ?? 'Failed to load login history.')
    }
  })

const fetchUserSessions = createServerFn({ method: 'GET' })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<SessionRecord[]> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []
    try {
      const res = await apiClient.get<{ success: boolean; data: SessionRecord[] }>(
        `mobile/users/${data.userId}/sessions`,
        { headers: { cookie } },
      )
      return res.data.data
    } catch (err: unknown) {
      const apiErr = err as ApiError
      throw new Error(apiErr?.message ?? 'Failed to load sessions.')
    }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Query options
// ─────────────────────────────────────────────────────────────────────────────

export const userDevicesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['mobile', 'devices', userId],
    queryFn: () => fetchUserDevices({ data: { userId } }),
    staleTime: 30_000,
    enabled: Boolean(userId),
  })

export const LOGIN_HISTORY_PAGE_SIZE = 10

/**
 * Infinite "load more" pagination over the server-side filtered history.
 * Filters live in the query key, so changing any of them resets the pages.
 */
export const userLoginHistoryInfiniteQueryOptions = (
  userId: string,
  filters: LoginHistoryFilters,
) =>
  infiniteQueryOptions({
    queryKey: ['mobile', 'login-history', userId, filters],
    queryFn: ({ pageParam }) =>
      fetchUserLoginHistory({
        data: {
          userId,
          page: pageParam,
          limit: LOGIN_HISTORY_PAGE_SIZE,
          ...filters,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
    enabled: Boolean(userId),
  })

export const userSessionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['mobile', 'sessions', userId],
    queryFn: () => fetchUserSessions({ data: { userId } }),
    staleTime: 30_000,
    enabled: Boolean(userId),
  })
