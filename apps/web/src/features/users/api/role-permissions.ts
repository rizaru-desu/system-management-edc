import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient, type ApiError } from '#/lib/api-client.ts'
import { SYSTEM_ADMIN, seedRolePermissions } from '../data/permissions.ts'
import type {
  ModulePermissions,
  RolePermissionMatrix,
} from '../data/permissions.ts'

/** Wire shape of GET/PUT /permissions on the backend. */
interface PermissionsPayload {
  matrix: Record<string, Record<string, ModulePermissions>>
}

function permissionsError(status: number): Error {
  return new Error(
    status === 401 || status === 403
      ? 'You need the System Administrator role to manage permissions.'
      : `Failed to load permissions (HTTP ${status}).`,
  )
}

/**
 * Fetches the stored V/C/U/D matrix and overlays it on the seed defaults, so
 * roles/modules that were never saved still show their default grants.
 * Cookie forwarding follows the same SSR reasoning as `list-users.ts`.
 */
const fetchRolePermissions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RolePermissionMatrix> => {
    const matrix = seedRolePermissions()
    const cookie = getRequestHeader('cookie')
    if (!cookie) return matrix

    try {
      const response = await apiClient.get<PermissionsPayload>('permissions', {
        headers: { cookie },
      })
      const stored = response.data.matrix
      for (const role of Object.keys(matrix) as Array<keyof typeof matrix>) {
        Object.assign(matrix[role], stored[role])
      }
      return matrix
    } catch (err: unknown) {
      const apiErr = err as ApiError
      const status = apiErr?.status ?? 500
      throw permissionsError(status)
    }
  },
)

const saveRolePermissionsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { matrix: RolePermissionMatrix }) => input)
  .handler(async ({ data }): Promise<void> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    // System_Administrator is always full-access and never stored; the
    // backend strips it too, this just keeps the payload honest.
    const { [SYSTEM_ADMIN]: _systemAdmin, ...matrix } = data.matrix

    try {
      await apiClient.put(
        'permissions',
        { matrix },
        {
          headers: { cookie },
        },
      )
    } catch (err: unknown) {
      const apiErr = err as ApiError
      const status = apiErr?.status ?? 500
      throw permissionsError(status)
    }
  })

export const rolePermissionsQueryKey = ['permissions', 'roles'] as const

export const rolePermissionsQueryOptions = () =>
  queryOptions({
    queryKey: rolePermissionsQueryKey,
    queryFn: () => fetchRolePermissions(),
    staleTime: 30_000,
  })

/**
 * Saves the matrix with an optimistic cache update; the follow-up invalidate
 * refetches the stored truth (and reverts the cache if the save failed).
 * Success and failure both surface as toasts — without one, a failed save
 * would only show as the matrix silently reverting.
 */
export function useSaveRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matrix: RolePermissionMatrix) =>
      saveRolePermissionsFn({ data: { matrix } }),
    onMutate: (matrix) => {
      queryClient.setQueryData(rolePermissionsQueryKey, matrix)
    },
    onSuccess: () => {
      toast.success('Role permissions saved.')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save role permissions.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: rolePermissionsQueryKey }),
  })
}
