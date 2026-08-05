import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient, type ApiError } from '#/lib/api-client.ts'
import { toUserRecord, usersQueryKey } from './list-users.ts'
import type { BackendUser } from './list-users.ts'
import { userStatsQueryKey } from './user-stats.ts'
import type { UserRecord, UserStatus } from '../data/users.ts'

export interface CreateUserInput {
  name: string
  email: string
  /** Role keys as stored in the DB; the backend requires at least one. */
  roles: Array<string>
  /** Initial credential password, set by the admin creating the account. */
  password: string
  status: UserStatus
  /** Shown on the Inactive badge; only sent along with an inactive status. */
  banReason: string | null
}

function createUserError(status: number, detail: string): Error {
  if (status === 401 || status === 403) {
    return new Error(detail || 'You do not have permission to create users.')
  }
  if (status === 409) {
    return new Error('Email is already in use by another account.')
  }
  return new Error(detail || `Failed to create user (HTTP ${status}).`)
}

/**
 * Creates a console account through the backend's POST /users (gated by the
 * users-module "create" grant). The backend hashes the initial password,
 * links the `credential` sign-in method and stores the role list. Cookie
 * forwarding follows the same SSR reasoning as `list-users.ts`.
 */
const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateUserInput) => input)
  .handler(async ({ data }): Promise<UserRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendUser>(
        'users',
        {
          name: data.name,
          email: data.email,
          roles: data.roles,
          password: data.password,
          banned: data.status === 'inactive',
          banReason: data.banReason,
        },
        {
          headers: { cookie },
        },
      )
      return toUserRecord(response.data)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      const status = apiErr?.status ?? 500
      const detail = apiErr?.data?.message || apiErr?.message || ''
      throw createUserError(status, detail)
    }
  })

/**
 * Mutation for the add-user form. Success/failure both surface as toasts;
 * settling refetches the list and the stat cards so the new row (and the
 * Total/Active counts) appear without a manual refresh.
 */
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUserFn({ data: input }),
    onSuccess: (user) => {
      toast.success(`User "${user.name}" created.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create user.',
      )
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKey }),
        queryClient.invalidateQueries({ queryKey: userStatsQueryKey }),
      ]),
  })
}
