import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { shipmentError, shipmentsQueryKey } from './list-inbound-shipments.ts'

/** One unit on the report, with the required accessories it lacked. */
export interface DiscrepancyUnit {
  id: string
  serialNumber: string
  productModelName: string
  productBrand: string
  notes: string | null
  photoUrl: string | null
  missingAccessories: Array<{ itemCategoryId: string; itemName: string }>
}

export interface DiscrepancyPeripheral {
  id: string
  itemCategoryId: string
  itemName: string
  itemUnit: string
  documentedQty: number
  receivedQty: number | null
  /** received − documented; negative means short-shipped. */
  variance: number
  notes: string | null
}

/** Everything worth raising with the partner about one shipment. */
export interface DiscrepancyReport {
  shipmentId: string
  doNumber: string
  partnerName: string
  destinationWarehouseName: string
  receivedDate: string
  missingUnits: Array<DiscrepancyUnit>
  damagedUnits: Array<DiscrepancyUnit>
  incompleteUnits: Array<DiscrepancyUnit>
  unlistedUnits: Array<DiscrepancyUnit>
  peripheralVariances: Array<DiscrepancyPeripheral>
  hasDiscrepancies: boolean
}

/**
 * Fetches the structured discrepancy data from GET
 * /inbound-shipments/:id/discrepancy-report — derived server-side from the
 * stored inspection results, so the report never disagrees with the record.
 */
const fetchDiscrepancyReport = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<DiscrepancyReport | null> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    try {
      const response = await apiClient.get<DiscrepancyReport>(
        `inbound-shipments/${encodeURIComponent(data.id)}/discrepancy-report`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to load the discrepancy report')
    }
  })

export const discrepancyReportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...shipmentsQueryKey, 'discrepancy-report', id],
    queryFn: () => fetchDiscrepancyReport({ data: { id } }),
    staleTime: 30_000,
  })
