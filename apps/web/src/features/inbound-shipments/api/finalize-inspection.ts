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
import type { InboundShipmentRecord } from '../data/inbound-shipments.ts'

/** What the finalize transaction actually created, straight from the API. */
export interface FinalizeSummary {
  createdTerminals: number
  createdSerialNumbers: Array<string>
  stockLinesUpdated: number
  stockQuantityAdded: number
  missingUnits: number
  damagedUnits: number
  incompleteUnits: number
  unlistedUnits: number
  peripheralVariance: number
}

export interface FinalizeResult {
  summary: FinalizeSummary
  shipment: InboundShipmentRecord
}

/**
 * Closes the inspection through POST /inbound-shipments/:id/finalize. The
 * backend creates a terminal per unit that passed QC, adds every counted
 * peripheral quantity to warehouse stock and completes the shipment — all
 * in one transaction, so a failure leaves nothing half-applied.
 */
const finalizeInspectionFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<FinalizeResult> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<{
        summary: FinalizeSummary
        shipment: BackendShipmentDetail
      }>(
        `inbound-shipments/${encodeURIComponent(data.id)}/finalize`,
        {},
        { headers: { cookie } },
      )
      return {
        summary: response.data.summary,
        shipment: toShipmentRecord(response.data.shipment),
      }
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to finalize the inspection')
    }
  })

/**
 * Mutation behind "Confirm & finalize". Terminals and stock levels change
 * as a side effect, so every shipment query is invalidated — and so are
 * the terminals ones, since the fleet just grew.
 */
export function useFinalizeInspection(shipmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => finalizeInspectionFn({ data: { id: shipmentId } }),
    onSuccess: (result) => {
      queryClient.setQueryData(
        shipmentDetailQueryKey(shipmentId),
        result.shipment,
      )
      const { createdTerminals, stockQuantityAdded } = result.summary
      toast.success(
        `Inspection finalized — ${createdTerminals} terminal${createdTerminals === 1 ? '' : 's'} registered as In Stock` +
          (stockQuantityAdded > 0
            ? ` and ${stockQuantityAdded} peripheral pcs added to warehouse stock.`
            : '.'),
        { duration: 8000 },
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to finalize the inspection.',
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: shipmentsQueryKey })
      // The fleet and its stock just changed under the other modules.
      void queryClient.invalidateQueries({ queryKey: ['terminals'] })
    },
  })
}
