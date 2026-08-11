import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { terminalError, terminalsQueryKey } from './list-terminals.ts'
import type { TerminalWarehouseType } from '../data/terminals.ts'

/** One entry of the product dropdown (active products only). */
export interface TerminalProductOption {
  id: string
  modelName: string
  brand: string
}

/** One entry of the warehouse dropdown, in tree order with its depth. */
export interface TerminalWarehouseOption {
  id: string
  name: string
  code: string
  type: TerminalWarehouseType
  /** 0 = Central level; drives the indentation in the dropdown. */
  depth: number
}

/** One entry of the merchant dropdown (active merchants only). */
export interface TerminalMerchantOption {
  id: string
  merchantName: string
}

const WAREHOUSE_TYPE_RECORDS: Record<string, TerminalWarehouseType> = {
  CENTRAL: 'central',
  REGIONAL: 'regional',
  SERVICE_POINT: 'service-point',
}

/**
 * The terminal form's dropdown sources, all served by the terminals module
 * itself (GET /terminals/{product,warehouse,merchant}-options) so the form
 * works with the terminals grant alone — the same decoupling the products
 * completeness picker uses. Cookies are forwarded manually for the same
 * SSR reason as the users feature.
 */
const fetchProductOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<TerminalProductOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<TerminalProductOption>>(
        'terminals/product-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to load the product options')
    }
  },
)

const fetchWarehouseOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<TerminalWarehouseOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<
        Array<Omit<TerminalWarehouseOption, 'type'> & { type: string }>
      >('terminals/warehouse-options', { headers: { cookie } })
      return response.data.map((row) => ({
        ...row,
        type: WAREHOUSE_TYPE_RECORDS[row.type] ?? 'service-point',
      }))
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to load the warehouse options')
    }
  },
)

const fetchMerchantOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<TerminalMerchantOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<TerminalMerchantOption>>(
        'terminals/merchant-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to load the merchant options')
    }
  },
)

export const terminalProductOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...terminalsQueryKey, 'product-options'],
    queryFn: () => fetchProductOptions(),
    staleTime: 30_000,
  })

export const terminalWarehouseOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...terminalsQueryKey, 'warehouse-options'],
    queryFn: () => fetchWarehouseOptions(),
    staleTime: 30_000,
  })

export const terminalMerchantOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...terminalsQueryKey, 'merchant-options'],
    queryFn: () => fetchMerchantOptions(),
    staleTime: 30_000,
  })
