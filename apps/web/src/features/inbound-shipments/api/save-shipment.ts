import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateDoNumberError,
  shipmentError,
  shipmentsQueryKey,
  toShipmentRecord,
} from './list-inbound-shipments.ts'
import type { BackendShipmentDetail } from './list-inbound-shipments.ts'
import type { InboundShipmentRecord } from '../data/inbound-shipments.ts'

/** The wizard's payload in backend shape (built once on the review step). */
export interface ShipmentPayload {
  doNumber: string
  partnerAccountId: string
  destinationWarehouseId: string
  /** null when the partner documented no dispatch date. */
  shipmentDate: string | null
  receivedDate: string
  notes: string | null
  status: 'DRAFT' | 'PENDING_INSPECTION'
  edcItems: Array<{ serialNumber: string; productId: string }>
  peripheralItems: Array<{ itemCategoryId: string; documentedQty: number }>
}

/**
 * Records a Delivery Order through POST /inbound-shipments (gated by the
 * module's "create" grant). The header and both manifests land in one
 * transaction, with every unit's completeness checklist snapshotted from
 * its product template server-side.
 */
const createShipmentFn = createServerFn({ method: 'POST' })
  .validator((input: ShipmentPayload) => input)
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendShipmentDetail>(
        'inbound-shipments',
        data,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to record the inbound shipment')
    }
  })

/**
 * Replaces a shipment through PUT /inbound-shipments/:id. The backend
 * rejects it once inspection has started, since rewriting the manifest
 * then would discard recorded results.
 */
const updateShipmentFn = createServerFn({ method: 'POST' })
  .validator((input: ShipmentPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.put<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(id)}`,
        payload,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to update the inbound shipment')
    }
  })

function saveErrorToast(error: unknown, fallback: string) {
  if (isDuplicateDoNumberError(error)) {
    toast.error('A shipment with this DO number already exists.')
    return
  }
  // Reference violations (unknown partner/warehouse/product/item, duplicate
  // serials) surface the backend's message verbatim.
  toast.error(error instanceof Error ? error.message : fallback)
}

/** Mutation for the wizard's create path; the list refetches on settle. */
export function useCreateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ShipmentPayload) => createShipmentFn({ data: input }),
    onError: (error) =>
      saveErrorToast(error, 'Failed to record the inbound shipment.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: shipmentsQueryKey }),
  })
}

/** Mutation for continuing a draft; list and detail refetch on settle. */
export function useUpdateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ShipmentPayload & { id: string }) =>
      updateShipmentFn({ data: input }),
    onError: (error) =>
      saveErrorToast(error, 'Failed to update the inbound shipment.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: shipmentsQueryKey }),
  })
}
