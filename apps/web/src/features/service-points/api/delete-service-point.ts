import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  servicePointError,
  servicePointTreeQueryKey,
  servicePointsQueryKey,
} from './service-point-tree.ts'
import type { ServicePointRecord } from '../data/service-points.ts'

/**
 * Soft-deletes a service point through DELETE /service-points/:id (gated by
 * the service-points-module "delete" grant). The backend refuses (409) while
 * live children exist — the dialog blocks that case up front, this is the
 * backstop.
 */
const deleteServicePointFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `service-points/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw servicePointError(err, 'Failed to delete the service point')
    }
  })

/**
 * Mutation for the delete dialog. The row disappears optimistically from
 * the cached tree; settling refetches, which restores it when the delete
 * was refused.
 */
export function useDeleteServicePoint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteServicePointFn({ data: { id: input.id } }),
    onMutate: (input) => {
      queryClient.setQueryData<Array<ServicePointRecord>>(
        servicePointTreeQueryKey,
        (records) => records?.filter((record) => record.id !== input.id),
      )
    },
    onSuccess: (_result, input) => {
      toast.success(`Service point “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the service point.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: servicePointsQueryKey }),
  })
}
