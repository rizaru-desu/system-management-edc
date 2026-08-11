import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-product.ts'
import type { ProductPayload } from './create-product.ts'
import {
  isDuplicateModelNameError,
  productError,
  productsQueryKey,
} from './list-products.ts'
import { toProductDetail } from './product-detail.ts'
import type { BackendProductDetail } from './product-detail.ts'
import type { ProductDetail } from '../data/products.ts'

/**
 * Updates a product through PATCH /products/:id (gated by the
 * products-module "update" grant). The completeness list is replaced
 * wholesale inside the backend's transaction; model-name uniqueness and
 * item existence are re-validated server-side.
 */
const updateProductFn = createServerFn({ method: 'POST' })
  .validator((input: ProductPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<ProductDetail> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendProductDetail>(
        `products/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toProductDetail(response.data)
    } catch (err: unknown) {
      throw productError(err, 'Failed to update the product')
    }
  })

/** Mutation for the edit flow; list and detail refetch on settle. */
export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductPayload & { id: string }) =>
      updateProductFn({ data: input }),
    onSuccess: (product) => {
      toast.success(`Product “${product.modelName}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateModelNameError(error)) {
        toast.error('A product with this model name already exists.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the product.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: productsQueryKey }),
  })
}

/**
 * Body-less status flip through PATCH /products/:id/toggle-status — the
 * table's quick toggle, kept off the editor's payload entirely.
 */
const toggleProductStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ProductDetail> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendProductDetail>(
        `products/${encodeURIComponent(data.id)}/toggle-status`,
        undefined,
        { headers: { cookie } },
      )
      return toProductDetail(response.data)
    } catch (err: unknown) {
      throw productError(err, 'Failed to change the product status')
    }
  })

/** Mutation for the table's status switch; the list refetches on settle. */
export function useToggleProductStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      toggleProductStatusFn({ data: input }),
    onSuccess: (product) => {
      toast.success(
        product.status === 'active'
          ? `Product “${product.modelName}” activated.`
          : `Product “${product.modelName}” deactivated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the product status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: productsQueryKey }),
  })
}
