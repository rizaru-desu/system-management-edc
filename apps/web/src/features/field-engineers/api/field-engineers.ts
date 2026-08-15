import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  AvailableEngineerUser,
  EngineerStatus,
  FieldEngineerRecord,
  SpecializationKey,
} from '../data/field-engineers.ts'
import type { WarehouseOption } from '../components/field-engineer-profile-modal.tsx'

/** Row shape returned by the backend's /field-engineers endpoints. */
export interface BackendFieldEngineer {
  userId: string
  name: string
  email: string
  profile: {
    warehouseId: string
    warehouseName: string
    coverageRegion: string
    specializations: Array<string>
    status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'
  } | null
  activeJobOrders: number
}

const STATUS_FROM_BACKEND: Record<string, EngineerStatus> = {
  ACTIVE: 'active',
  ON_LEAVE: 'on_leave',
  INACTIVE: 'inactive',
}

const STATUS_TO_BACKEND: Record<EngineerStatus, string> = {
  active: 'ACTIVE',
  on_leave: 'ON_LEAVE',
  inactive: 'INACTIVE',
}

/** Backend row → the console record (uppercase enums → console values). */
export function toFieldEngineerRecord(
  row: BackendFieldEngineer,
): FieldEngineerRecord {
  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    profile: row.profile
      ? {
          warehouseId: row.profile.warehouseId,
          warehouseName: row.profile.warehouseName,
          coverageRegion: row.profile.coverageRegion,
          // The keys are shared verbatim with the backend catalogue.
          specializations: row.profile
            .specializations as Array<SpecializationKey>,
          status: STATUS_FROM_BACKEND[row.profile.status] ?? 'active',
        }
      : null,
    activeJobOrders: row.activeJobOrders,
  }
}

export function fieldEngineerError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage field engineers.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

// ─── List ──────────────────────────────────────────────────────────────────

export interface FieldEngineersListPage {
  engineers: Array<FieldEngineerRecord>
  total: number
}

export interface FieldEngineersQueryFilters {
  search?: string
  warehouseId?: string
  profileStatus?: 'all' | 'complete' | 'needs-setup'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of Field Engineer role users (profile LEFT-joined,
 * null profile = "Needs Setup") from GET /field-engineers, gated by the
 * "engineers" module's view grant. Search/filters/pagination all run
 * server-side; cookies are forwarded manually for the same SSR reason as
 * the users feature.
 */
const fetchFieldEngineers = createServerFn({ method: 'GET' })
  .validator((input: FieldEngineersQueryFilters) => input)
  .handler(async ({ data }): Promise<FieldEngineersListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { engineers: [], total: 0 }

    try {
      const response = await apiClient.get<{
        engineers: Array<BackendFieldEngineer>
        total: number
      }>('field-engineers', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.warehouseId && data.warehouseId !== 'all'
            ? { warehouseId: data.warehouseId }
            : undefined),
          ...(data.profileStatus && data.profileStatus !== 'all'
            ? { profileStatus: data.profileStatus }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        engineers: response.data.engineers.map(toFieldEngineerRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to load the field engineers')
    }
  })

/** Base key shared by every field-engineers query. */
export const fieldEngineersQueryKey = ['field-engineers'] as const

export const fieldEngineersListQueryOptions = ({
  search = '',
  warehouseId = 'all',
  profileStatus = 'all',
  page = 1,
  pageSize = 50,
}: FieldEngineersQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...fieldEngineersQueryKey,
      'list',
      search.trim(),
      warehouseId,
      profileStatus,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchFieldEngineers({
        data: { search, warehouseId, profileStatus, page, pageSize },
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

// ─── Detail ────────────────────────────────────────────────────────────────

const fetchFieldEngineer = createServerFn({ method: 'GET' })
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<FieldEngineerRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.get<BackendFieldEngineer>(
        `field-engineers/${encodeURIComponent(data.userId)}`,
        { headers: { cookie } },
      )
      return toFieldEngineerRecord(response.data)
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to load the field engineer')
    }
  })

export const fieldEngineerDetailQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: [...fieldEngineersQueryKey, 'detail', userId],
    queryFn: () => fetchFieldEngineer({ data: { userId } }),
    staleTime: 30_000,
  })

// ─── Options feeds ─────────────────────────────────────────────────────────

const fetchAvailableUsers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<AvailableEngineerUser>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<AvailableEngineerUser>>(
        'field-engineers/available-users',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to load the available users')
    }
  },
)

/** Field Engineer role users without a profile — the onboarding picker. */
export const availableEngineerUsersQueryOptions = () =>
  queryOptions({
    queryKey: [...fieldEngineersQueryKey, 'available-users'],
    queryFn: () => fetchAvailableUsers(),
    staleTime: 30_000,
  })

const fetchWarehouseOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<WarehouseOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<
        Array<{ id: string; name: string; code: string; type: string }>
      >('field-engineers/warehouse-options', { headers: { cookie } })
      return response.data.map((option) => ({
        id: option.id,
        name: `${option.name} (${option.code})`,
      }))
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to load the warehouses')
    }
  },
)

/** Active warehouses for the profile form + list filter. */
export const engineerWarehouseOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...fieldEngineersQueryKey, 'warehouse-options'],
    queryFn: () => fetchWarehouseOptions(),
    staleTime: 30_000,
  })

// ─── Mutations ─────────────────────────────────────────────────────────────

/** The profile form's payload in backend shape. */
export interface FieldEngineerProfilePayload {
  warehouseId: string
  coverageRegion: string
  specializations: Array<SpecializationKey>
  status: EngineerStatus
}

function toBackendProfile(payload: FieldEngineerProfilePayload) {
  return {
    warehouseId: payload.warehouseId,
    coverageRegion: payload.coverageRegion,
    specializations: payload.specializations,
    status: STATUS_TO_BACKEND[payload.status],
  }
}

const createProfileFn = createServerFn({ method: 'POST' })
  .validator((input: FieldEngineerProfilePayload & { userId: string }) => input)
  .handler(async ({ data }): Promise<FieldEngineerRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { userId, ...payload } = data
    try {
      const response = await apiClient.post<BackendFieldEngineer>(
        'field-engineers',
        { userId, ...toBackendProfile(payload) },
        { headers: { cookie } },
      )
      return toFieldEngineerRecord(response.data)
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to create the profile')
    }
  })

const updateProfileFn = createServerFn({ method: 'POST' })
  .validator((input: FieldEngineerProfilePayload & { userId: string }) => input)
  .handler(async ({ data }): Promise<FieldEngineerRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { userId, ...payload } = data
    try {
      const response = await apiClient.patch<BackendFieldEngineer>(
        `field-engineers/${encodeURIComponent(userId)}`,
        toBackendProfile(payload),
        { headers: { cookie } },
      )
      return toFieldEngineerRecord(response.data)
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to update the profile')
    }
  })

const setStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { userId: string; status: EngineerStatus }) => input)
  .handler(async ({ data }): Promise<FieldEngineerRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendFieldEngineer>(
        `field-engineers/${encodeURIComponent(data.userId)}/status`,
        { status: STATUS_TO_BACKEND[data.status] },
        { headers: { cookie } },
      )
      return toFieldEngineerRecord(response.data)
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to change the status')
    }
  })

const removeProfileFn = createServerFn({ method: 'POST' })
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<{ userId: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ userId: string }>(
        `field-engineers/${encodeURIComponent(data.userId)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw fieldEngineerError(err, 'Failed to remove the profile')
    }
  })

/** Onboards an available user; lists + available-users refetch on settle. */
export function useCreateEngineerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FieldEngineerProfilePayload & { userId: string }) =>
      createProfileFn({ data: input }),
    onSuccess: (engineer) => {
      toast.success(`Profile for “${engineer.name}” completed.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the profile.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: fieldEngineersQueryKey }),
  })
}

export function useUpdateEngineerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FieldEngineerProfilePayload & { userId: string }) =>
      updateProfileFn({ data: input }),
    onSuccess: (engineer) => {
      toast.success(`Profile for “${engineer.name}” updated.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the profile.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: fieldEngineersQueryKey }),
  })
}

/** Quick duty-status change from the list/detail. */
export function useSetEngineerStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; status: EngineerStatus }) =>
      setStatusFn({ data: input }),
    onSuccess: (engineer) => {
      toast.success(`“${engineer.name}” status updated.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to change the status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: fieldEngineersQueryKey }),
  })
}

/** Removes the work profile only — the User account stays untouched. */
export function useRemoveEngineerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string }) => removeProfileFn({ data: input }),
    onSuccess: () => {
      toast.success('Field engineer profile removed.')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to remove the profile.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: fieldEngineersQueryKey }),
  })
}
