import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  servicePointError,
  servicePointsQueryKey,
  toBackendStatus,
  toServicePointRecord,
} from './service-point-tree.ts'
import type { BackendServicePoint } from './service-point-tree.ts'
import type {
  ServicePointRecord,
  ServicePointStatus,
} from '../data/service-points.ts'

/** The add/edit form's payload, in frontend field shapes. */
export interface ServicePointPayload {
  code: string
  name: string
  parentId: string | null
  region: string | null
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  /** Service area radius (km) for automatic merchant assignment; null = unlimited. */
  coverageRadiusKm: number | null
  notes: string | null
  status: ServicePointStatus
}

/** Frontend payload → the backend DTO (uppercase status enum). */
export function toBackendPayload(payload: ServicePointPayload) {
  return { ...payload, status: toBackendStatus(payload.status) }
}

/**
 * Creates a service point through POST /service-points (gated by the
 * service-points-module "create" grant). Uniqueness of the code and parent
 * existence are validated server-side; 409 = code already in use.
 */
const createServicePointFn = createServerFn({ method: 'POST' })
  .validator((input: ServicePointPayload) => input)
  .handler(async ({ data }): Promise<ServicePointRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendServicePoint>(
        'service-points',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toServicePointRecord(response.data)
    } catch (err: unknown) {
      throw servicePointError(err, 'Failed to create the service point')
    }
  })

/**
 * Mutation for the add form. Creation is pessimistic (the server mints the
 * id), so the tree refetches on settle; success and failure both surface as
 * toasts.
 */
export function useCreateServicePoint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ServicePointPayload) =>
      createServicePointFn({ data: input }),
    onSuccess: (servicePoint) => {
      toast.success(`Service point “${servicePoint.name}” created.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the service point.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: servicePointsQueryKey }),
  })
}
