import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  shipmentError,
  shipmentsListQueryKey,
  toShipmentRecord,
} from './list-inbound-shipments.ts'
import type { BackendShipmentDetail } from './list-inbound-shipments.ts'
import { shipmentDetailQueryKey } from './shipment-detail.ts'
import type {
  InboundShipmentRecord,
  ShipmentUnit,
} from '../data/inbound-shipments.ts'

/** One unit's inspection result, in the PATCH body's shape. */
export interface EdcItemPatch {
  foundStatus?: 'PENDING' | 'FOUND' | 'MISSING'
  condition?: 'GOOD' | 'DAMAGED' | null
  notes?: string | null
  photoUrl?: string | null
  accessories?: Array<{ itemCategoryId: string; isPresent: boolean }>
}

const patchEdcItemFn = createServerFn({ method: 'POST' })
  .validator(
    (input: { shipmentId: string; itemId: string; patch: EdcItemPatch }) =>
      input,
  )
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(data.shipmentId)}/edc-items/${encodeURIComponent(data.itemId)}`,
        data.patch,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to save the inspection result')
    }
  })

const addUnlistedItemFn = createServerFn({ method: 'POST' })
  .validator(
    (input: { shipmentId: string; serialNumber: string; productId: string }) =>
      input,
  )
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(data.shipmentId)}/edc-items`,
        { serialNumber: data.serialNumber, productId: data.productId },
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to add the unlisted unit')
    }
  })

const patchPeripheralItemFn = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      shipmentId: string
      itemId: string
      patch: { receivedQty?: number | null; notes?: string | null }
    }) => input,
  )
  .handler(async ({ data }): Promise<InboundShipmentRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(data.shipmentId)}/peripheral-items/${encodeURIComponent(data.itemId)}`,
        data.patch,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to save the counted quantity')
    }
  })

/**
 * Row-level inspection writes. Each one returns the whole refreshed
 * shipment, so the detail cache is replaced outright on success — no
 * refetch round trip while the inspector works down the list. The
 * workspace holds its own draft copy for instant feedback and reverts that
 * row when a request fails, which is the rollback half of the optimistic
 * update; the invalidation of the *list* key keeps the inspected counters
 * on the index page honest.
 */
export function useInspectionMutations(shipmentId: string) {
  const queryClient = useQueryClient()

  const applyResult = (shipment: InboundShipmentRecord) => {
    queryClient.setQueryData(shipmentDetailQueryKey(shipmentId), shipment)
    void queryClient.invalidateQueries({ queryKey: shipmentsListQueryKey })
  }

  const patchEdcItem = useMutation({
    mutationFn: (input: { itemId: string; patch: EdcItemPatch }) =>
      patchEdcItemFn({ data: { shipmentId, ...input } }),
    onSuccess: applyResult,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save the inspection result.',
      )
    },
  })

  const addUnlistedItem = useMutation({
    mutationFn: (input: { serialNumber: string; productId: string }) =>
      addUnlistedItemFn({ data: { shipmentId, ...input } }),
    onSuccess: (shipment, variables) => {
      applyResult(shipment)
      toast.success(
        `Unlisted unit “${variables.serialNumber}” added for inspection.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add the unit.',
      )
    },
  })

  const patchPeripheralItem = useMutation({
    mutationFn: (input: {
      itemId: string
      patch: { receivedQty?: number | null; notes?: string | null }
    }) => patchPeripheralItemFn({ data: { shipmentId, ...input } }),
    onSuccess: applyResult,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save the counted quantity.',
      )
    },
  })

  return { patchEdcItem, addUnlistedItem, patchPeripheralItem }
}

/** Console unit → the PATCH body the backend expects for its result. */
export function toEdcItemPatch(unit: ShipmentUnit): EdcItemPatch {
  return {
    foundStatus:
      unit.result === 'found'
        ? 'FOUND'
        : unit.result === 'missing'
          ? 'MISSING'
          : 'PENDING',
    condition:
      unit.result === 'found'
        ? unit.condition === 'damaged'
          ? 'DAMAGED'
          : 'GOOD'
        : null,
    notes: unit.note.trim() ? unit.note.trim() : null,
    photoUrl: unit.photoUrl,
    accessories: unit.checklist.map((entry) => ({
      itemCategoryId: entry.itemCategoryId,
      isPresent: entry.present,
    })),
  }
}
