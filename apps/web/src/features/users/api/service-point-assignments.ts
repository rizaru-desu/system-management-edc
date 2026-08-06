import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import {
  fromBackendRole,
  toBackendRole,
} from '../data/service-point-assignments.ts'
import type {
  ServicePointAssignment,
  ServicePointRoleKey,
} from '../data/service-point-assignments.ts'

/** Row shape returned by GET/PUT /users/:userId/service-points. */
interface BackendAssignment {
  id: string
  userId: string
  servicePointId: string
  roleAtServicePoint: string
  isDefault: boolean
  status: 'ACTIVE' | 'INACTIVE'
  assignedAt: string
  servicePoint: {
    id: string
    code: string
    name: string
    region: string | null
    status: 'ACTIVE' | 'INACTIVE'
  }
}

function toAssignment(row: BackendAssignment): ServicePointAssignment {
  return {
    id: row.id,
    userId: row.userId,
    servicePointId: row.servicePointId,
    roleAtServicePoint: fromBackendRole(row.roleAtServicePoint),
    isDefault: row.isDefault,
    assignedAt: new Date(row.assignedAt).toISOString().slice(0, 10),
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
  }
}

function assignmentsError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage assignments.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/**
 * Fetches a user's ACTIVE service point assignments from
 * GET /users/:userId/service-points (gated by the users-module "view"
 * grant). Cookie forwarding follows the same SSR reasoning as
 * `list-users.ts`.
 */
const fetchUserAssignments = createServerFn({ method: 'GET' })
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<Array<ServicePointAssignment>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<{
        assignments: Array<BackendAssignment>
      }>(`users/${encodeURIComponent(data.userId)}/service-points`, {
        headers: { cookie },
      })
      return response.data.assignments.map(toAssignment)
    } catch (err: unknown) {
      throw assignmentsError(err, 'Failed to load assignments')
    }
  })

export const userAssignmentsQueryKey = (userId: string) =>
  ['users', 'service-point-assignments', userId] as const

export const userAssignmentsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: userAssignmentsQueryKey(userId),
    queryFn: () => fetchUserAssignments({ data: { userId } }),
    staleTime: 30_000,
  })

/**
 * Assignment counts for the users table's "Service Points" column. The
 * backend contract is per-user (GET /users/:id/service-points), so one
 * server fn fans the current page's ids out server-side — a single client
 * round trip. A user whose fetch fails reports null, rendered as an em dash.
 */
const fetchAssignmentCounts = createServerFn({ method: 'GET' })
  .validator((input: { userIds: Array<string> }) => ({
    userIds: input.userIds.filter((id) => typeof id === 'string' && id !== ''),
  }))
  .handler(async ({ data }): Promise<Record<string, number | null>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return {}

    const results = await Promise.allSettled(
      data.userIds.map((userId) =>
        apiClient.get<{ assignments: Array<BackendAssignment> }>(
          `users/${encodeURIComponent(userId)}/service-points`,
          { headers: { cookie } },
        ),
      ),
    )

    const counts: Record<string, number | null> = {}
    data.userIds.forEach((userId, index) => {
      const result = results[index]
      counts[userId] =
        result.status === 'fulfilled'
          ? result.value.data.assignments.length
          : null
    })
    return counts
  })

export const assignmentCountsQueryKey = [
  'users',
  'service-point-assignment-counts',
] as const

export const assignmentCountsQueryOptions = (userIds: Array<string>) =>
  queryOptions({
    // Sorted so the key is stable regardless of row order.
    queryKey: [...assignmentCountsQueryKey, [...userIds].sort().join(',')],
    queryFn: () => fetchAssignmentCounts({ data: { userIds } }),
    enabled: userIds.length > 0,
    staleTime: 30_000,
  })

/** One desired assignment of the PUT replace payload. */
export interface ReplaceAssignmentEntry {
  servicePointId: string
  roleAtServicePoint: ServicePointRoleKey
  isDefault: boolean
}

export interface ReplaceAssignmentsInput {
  userId: string
  /** Shown in the toasts. */
  userName: string
  assignments: Array<ReplaceAssignmentEntry>
}

/**
 * Replaces the user's whole assignment set through
 * PUT /users/:userId/service-points (gated by the users-module "update"
 * grant); the backend synchronizes in one transaction and returns the new
 * ACTIVE set.
 */
const replaceAssignmentsFn = createServerFn({ method: 'POST' })
  .validator((input: ReplaceAssignmentsInput) => input)
  .handler(async ({ data }): Promise<Array<ServicePointAssignment>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.put<{
        assignments: Array<BackendAssignment>
      }>(
        `users/${encodeURIComponent(data.userId)}/service-points`,
        {
          assignments: data.assignments.map((entry) => ({
            servicePointId: entry.servicePointId,
            roleAtServicePoint: toBackendRole(entry.roleAtServicePoint),
            isDefault: entry.isDefault,
          })),
        },
        { headers: { cookie } },
      )
      return response.data.assignments.map(toAssignment)
    } catch (err: unknown) {
      throw assignmentsError(err, 'Failed to save assignments')
    }
  })

/**
 * Mutation for the assignment drawer's Save. The fresh set lands in the
 * user's assignment cache on success; the counts column invalidates either
 * way so it always mirrors the stored truth.
 */
export function useReplaceAssignments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReplaceAssignmentsInput) =>
      replaceAssignmentsFn({ data: input }),
    onSuccess: (assignments, input) => {
      queryClient.setQueryData(
        userAssignmentsQueryKey(input.userId),
        assignments,
      )
      toast.success(
        `Service point assignments for “${input.userName}” updated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save assignments.',
      )
    },
    onSettled: (_assignments, _error, input) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: userAssignmentsQueryKey(input.userId),
        }),
        queryClient.invalidateQueries({ queryKey: assignmentCountsQueryKey }),
      ]),
  })
}
