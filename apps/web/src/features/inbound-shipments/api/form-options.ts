import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { shipmentError, shipmentsQueryKey } from './list-inbound-shipments.ts'
import type { ShipmentWarehouseType } from '../data/inbound-shipments.ts'

/** One entry of the partner dropdown (active accounts only). */
export interface ShipmentPartnerOption {
  id: string
  accountId: string
  accountName: string
  accountType: 'CORPORATE' | 'BRANCH' | 'AGGREGATOR'
}

/** One entry of the product dropdown (active products only). */
export interface ShipmentProductOption {
  id: string
  modelName: string
  brand: string
}

/** One entry of the warehouse dropdown, in tree order with its depth. */
export interface ShipmentWarehouseOption {
  id: string
  name: string
  code: string
  type: ShipmentWarehouseType
  /** 0 = Central level; drives the indentation in the dropdown. */
  depth: number
}

/** One entry of the peripheral item dropdown (active items only). */
export interface ShipmentItemOption {
  id: string
  name: string
  code: string | null
  unit: string
}

const WAREHOUSE_TYPE_RECORDS: Record<string, ShipmentWarehouseType> = {
  CENTRAL: 'central',
  REGIONAL: 'regional',
  SERVICE_POINT: 'service-point',
}

/** Sort order used by the destination dropdown: Central sites first. */
const TYPE_RANK: Record<ShipmentWarehouseType, number> = {
  central: 0,
  regional: 1,
  'service-point': 2,
}

/**
 * The wizard's dropdown sources, all served by the inbound-shipments
 * module itself (GET /inbound-shipments/{partner,product,warehouse,item}-options)
 * so the form works with the shipments grant alone — the same decoupling
 * the terminals form uses. Cookies are forwarded manually for the same SSR
 * reason as the users feature.
 */
const fetchPartnerOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ShipmentPartnerOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<ShipmentPartnerOption>>(
        'inbound-shipments/partner-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to load the partner options')
    }
  },
)

const fetchProductOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ShipmentProductOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<ShipmentProductOption>>(
        'inbound-shipments/product-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to load the product options')
    }
  },
)

const fetchWarehouseOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ShipmentWarehouseOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<
        Array<Omit<ShipmentWarehouseOption, 'type'> & { type: string }>
      >('inbound-shipments/warehouse-options', { headers: { cookie } })
      return response.data.map((row) => ({
        ...row,
        type: WAREHOUSE_TYPE_RECORDS[row.type] ?? 'service-point',
      }))
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to load the warehouse options')
    }
  },
)

const fetchItemOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ShipmentItemOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<ShipmentItemOption>>(
        'inbound-shipments/item-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to load the peripheral item options')
    }
  },
)

export const shipmentPartnerOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...shipmentsQueryKey, 'partner-options'],
    queryFn: () => fetchPartnerOptions(),
    staleTime: 30_000,
  })

export const shipmentProductOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...shipmentsQueryKey, 'product-options'],
    queryFn: () => fetchProductOptions(),
    staleTime: 30_000,
  })

/**
 * Warehouses ordered Central first — inbound stock from partners normally
 * lands at a Central site — while every level stays pickable.
 */
export const shipmentWarehouseOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...shipmentsQueryKey, 'warehouse-options'],
    queryFn: async () => {
      const options = await fetchWarehouseOptions()
      return [...options].sort(
        (a, b) =>
          TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.name.localeCompare(b.name),
      )
    },
    staleTime: 30_000,
  })

export const shipmentItemOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...shipmentsQueryKey, 'item-options'],
    queryFn: () => fetchItemOptions(),
    staleTime: 30_000,
  })
