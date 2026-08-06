import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-service-point.ts'
import type { ServicePointPayload } from './create-service-point.ts'
import {
  servicePointError,
  servicePointTreeQueryKey,
  servicePointsQueryKey,
  toServicePointRecord,
} from './service-point-tree.ts'
import type { BackendServicePoint } from './service-point-tree.ts'
import type { ServicePointRecord } from '../data/service-points.ts'

export interface UpdateServicePointInput extends ServicePointPayload {
  id: string
}

/**
 * Saves the edit form through PATCH /service-points/:id (gated by the
 * service-points-module "update" grant). Hierarchy rules — parent existence,
 * self-parenting, circular ancestry — are enforced server-side; 409 = code
 * already in use.
 */
const updateServicePointFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateServicePointInput) => input)
  .handler(async ({ data }): Promise<ServicePointRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendServicePoint>(
        `service-points/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toServicePointRecord(response.data)
    } catch (err: unknown) {
      throw servicePointError(err, 'Failed to update the service point')
    }
  })

/**
 * Mutation for the edit form. The edited record is swapped optimistically
 * into the cached tree; settling refetches, which also reverts the swap when
 * the save failed (e.g. a circular-hierarchy rejection).
 */
export function useUpdateServicePoint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateServicePointInput) =>
      updateServicePointFn({ data: input }),
    onMutate: (input) => {
      queryClient.setQueryData<Array<ServicePointRecord>>(
        servicePointTreeQueryKey,
        (records) =>
          records?.map((record) =>
            record.id === input.id ? { ...record, ...input } : record,
          ),
      )
    },
    onSuccess: (servicePoint) => {
      toast.success(`Service point “${servicePoint.name}” updated.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the service point.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: servicePointsQueryKey }),
  })
}
