import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  shipmentError,
  shipmentsQueryKey,
  toShipmentRecord,
} from './list-inbound-shipments.ts'
import type { BackendShipmentDetail } from './list-inbound-shipments.ts'
import { shipmentDetailQueryKey } from './shipment-detail.ts'
import type {
  DiscrepancyPartnerResponse,
  InboundShipmentRecord,
} from '../data/inbound-shipments.ts'

/**
 * The three discrepancy follow-up steps, all POSTs under
 * /inbound-shipments/:id/discrepancy/* (module "update" grant): emailing
 * the report to the partner, recording the partner's answer, and closing
 * the case by hand. Each returns the refreshed shipment detail.
 */

const sendDiscrepancyReportFn = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      id: string
      recipientEmail: string | null
      message: string | null
    }) => input,
  )
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.post<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(id)}/discrepancy/send`,
        payload,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to send the discrepancy report')
    }
  })

const confirmDiscrepancyFn = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      id: string
      partnerResponse: DiscrepancyPartnerResponse
      notes: string | null
    }) => input,
  )
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.post<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(id)}/discrepancy/confirm`,
        payload,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, "Failed to record the partner's confirmation")
    }
  })

const resolveDiscrepancyFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; notes: string | null }) => input)
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.post<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(id)}/discrepancy/resolve`,
        payload,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to resolve the discrepancy case')
    }
  })

/** Shared onSuccess plumbing: refresh the detail cache and the lists. */
function useDiscrepancyMutation<TInput>(
  shipmentId: string,
  mutationFn: (input: TInput) => Promise<InboundShipmentRecord>,
  successToast: string,
  errorFallback: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (shipment) => {
      queryClient.setQueryData(shipmentDetailQueryKey(shipmentId), shipment)
      toast.success(successToast)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : errorFallback)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: shipmentsQueryKey })
    },
  })
}

/** Mutation behind "Email report to partner". */
export function useSendDiscrepancyReport(shipmentId: string) {
  return useDiscrepancyMutation(
    shipmentId,
    (input: { recipientEmail: string | null; message: string | null }) =>
      sendDiscrepancyReportFn({ data: { id: shipmentId, ...input } }),
    'Discrepancy report emailed to the partner.',
    'Failed to send the discrepancy report.',
  )
}

/** Mutation behind "Record partner confirmation". */
export function useConfirmDiscrepancy(shipmentId: string) {
  return useDiscrepancyMutation(
    shipmentId,
    (input: {
      partnerResponse: DiscrepancyPartnerResponse
      notes: string | null
    }) => confirmDiscrepancyFn({ data: { id: shipmentId, ...input } }),
    "Partner's confirmation recorded.",
    "Failed to record the partner's confirmation.",
  )
}

/** Mutation behind "Mark resolved". */
export function useResolveDiscrepancy(shipmentId: string) {
  return useDiscrepancyMutation(
    shipmentId,
    (input: { notes: string | null }) =>
      resolveDiscrepancyFn({ data: { id: shipmentId, ...input } }),
    'Discrepancy case resolved.',
    'Failed to resolve the discrepancy case.',
  )
}
