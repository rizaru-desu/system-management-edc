import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import {
  shipmentError,
  shipmentsQueryKey,
  toShipmentRecord,
} from './list-inbound-shipments.ts'
import type { BackendShipmentDetail } from './list-inbound-shipments.ts'
import type { InboundShipmentRecord } from '../data/inbound-shipments.ts'

/**
 * Fetches one shipment from GET /inbound-shipments/:id — the header plus
 * both manifests and every unit's completeness checklist in one payload.
 * A 404 resolves to null so the page can render its not-found state
 * instead of the error card.
 */
const fetchShipmentDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<InboundShipmentRecord | null> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    try {
      const response = await apiClient.get<BackendShipmentDetail>(
        `inbound-shipments/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return toShipmentRecord(response.data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null
      throw shipmentError(err, 'Failed to load the inbound shipment')
    }
  })

export const shipmentDetailQueryKey = (id: string) =>
  [...shipmentsQueryKey, 'detail', id] as const

export const shipmentDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: shipmentDetailQueryKey(id),
    queryFn: () => fetchShipmentDetail({ data: { id } }),
    staleTime: 30_000,
  })
