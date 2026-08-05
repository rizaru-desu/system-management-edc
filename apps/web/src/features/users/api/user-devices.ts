import { queryOptions } from '@tanstack/react-query'
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
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<LoginHistoryRecord[]> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []
    try {
      const res = await apiClient.get<{ success: boolean; data: LoginHistoryRecord[] }>(
        `mobile/users/${data.userId}/login-history`,
        { headers: { cookie } },
      )
      return res.data.data
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

export const userLoginHistoryQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['mobile', 'login-history', userId],
    queryFn: () => fetchUserLoginHistory({ data: { userId } }),
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
