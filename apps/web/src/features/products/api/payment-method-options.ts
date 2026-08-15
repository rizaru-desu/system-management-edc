import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { productError, productsQueryKey } from './list-products.ts'

/** One entry of the editor's Payment Methods dropdown (active only). */
export interface PaymentMethodOption {
  id: string
  name: string
  code: string | null
}

/**
 * Fetches the active payment methods for the editor's Payment Methods
 * tab from GET /products/payment-method-options — served by the products
 * module itself so the editor works with the products grant alone (the
 * same decoupling as the completeness picker). Cookies are forwarded
 * manually for the same SSR reason as the users feature.
 */
const fetchPaymentMethodOptions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<PaymentMethodOption>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<PaymentMethodOption>>(
        'products/payment-method-options',
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw productError(err, 'Failed to load the payment methods')
    }
  },
)

export const paymentMethodOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...productsQueryKey, 'payment-method-options'],
    queryFn: () => fetchPaymentMethodOptions(),
    staleTime: 30_000,
  })
