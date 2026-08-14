import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateModelNameError,
  productError,
  productsQueryKey,
  toBackendCategory,
  toBackendStatus,
} from './list-products.ts'
import { toProductDetail } from './product-detail.ts'
import type { BackendProductDetail } from './product-detail.ts'
import type {
  ProductCategory,
  ProductDetail,
  ProductStatus,
} from '../data/products.ts'

/** The editor's payload in console shape (display labels, '' for blanks). */
export interface ProductPayload {
  modelName: string
  brand: string
  category: ProductCategory
  description: string
  status: ProductStatus
  completenessItems: Array<{
    itemCategoryId: string
    required: boolean
    standardQty: number
  }>
  paymentMethods: Array<{
    paymentMethodId: string
    required: boolean
  }>
}

/** Console payload → the backend body (labels → uppercase enums, '' → null). */
export function toBackendPayload(payload: ProductPayload) {
  return {
    modelName: payload.modelName,
    brand: payload.brand,
    category: toBackendCategory(payload.category),
    description: payload.description.trim() ? payload.description.trim() : null,
    status: toBackendStatus(payload.status),
    completenessItems: payload.completenessItems,
    paymentMethods: payload.paymentMethods,
  }
}

/**
 * Creates a product (with its completeness list) through POST /products
 * (gated by the products-module "create" grant). Model-name uniqueness and
 * item existence are validated server-side.
 */
const createProductFn = createServerFn({ method: 'POST' })
  .validator((input: ProductPayload) => input)
  .handler(async ({ data }): Promise<ProductDetail> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendProductDetail>(
        'products',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toProductDetail(response.data)
    } catch (err: unknown) {
      throw productError(err, 'Failed to create the product')
    }
  })

/** Mutation for the create flow; the list refetches on settle. */
export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductPayload) => createProductFn({ data: input }),
    onSuccess: (product) => {
      toast.success(`Product “${product.modelName}” created.`)
    },
    onError: (error) => {
      if (isDuplicateModelNameError(error)) {
        toast.error('A product with this model name already exists.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the product.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: productsQueryKey }),
  })
}
