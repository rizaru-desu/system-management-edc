import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient, type ApiError } from '#/lib/api-client.ts'
import { toUserRecord, usersQueryKey } from './list-users.ts'
import type { BackendUser, UsersListPage } from './list-users.ts'
import { userStatsQueryKey } from './user-stats.ts'
import type { UserRecord, UserStatus } from '../data/users.ts'

export interface UpdateUserInput {
  id: string
  name: string
  email: string
  /** Role keys as stored in the DB (may include non-catalogue keys). */
  roles: Array<string>
  status: UserStatus
  /** Shown on the Inactive badge; only sent along with an inactive status. */
  banReason: string | null
}

function updateUserError(status: number, detail: string): Error {
  if (status === 401 || status === 403) {
    return new Error(detail || 'You do not have permission to update users.')
  }
  if (status === 409) {
    return new Error('Email is already in use by another account.')
  }
  return new Error(detail || `Failed to update user (HTTP ${status}).`)
}

/**
 * Saves the edit-user form through the backend's PATCH /users/:id. Console
 * role keys are stored verbatim in `user.role` (multi-role is comma-joined
 * server-side) and the "Active account" toggle maps onto Better Auth's ban
 * semantics (`banned: true` = inactive). Cookie forwarding follows the same
 * SSR reasoning as `list-users.ts`.
 */
const updateUserFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateUserInput) => input)
  .handler(async ({ data }): Promise<UserRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendUser>(
        `users/${encodeURIComponent(data.id)}`,
        {
          name: data.name,
          email: data.email,
          roles: data.roles,
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
      throw updateUserError(status, detail)
    }
  })

/**
 * Mutation for the edit-user form. The edited row is swapped optimistically
 * into every cached list page; settling refetches the list and the stat
 * cards, which also reverts that swap when the save failed. Success and
 * failure both surface as toasts (without one, a failed save would only
 * show as the row silently reverting).
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUserFn({ data: input }),
    onMutate: (input) => {
      const banReason = input.status === 'inactive' ? input.banReason : null
      queryClient.setQueriesData<UsersListPage>(
        { queryKey: usersQueryKey },
        (page) =>
          page && {
            ...page,
            users: page.users.map((user) =>
              user.id === input.id ? { ...user, ...input, banReason } : user,
            ),
          },
      )
    },
    onSuccess: (user) => {
      toast.success(`Changes to "${user.name}" saved.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update user.',
      )
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKey }),
        queryClient.invalidateQueries({ queryKey: userStatsQueryKey }),
      ]),
  })
}
