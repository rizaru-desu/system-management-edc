import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { productError, productsQueryKey } from './list-products.ts'

/**
 * Deletes a product through DELETE /products/:id (gated by the
 * products-module "delete" grant). The backend soft-deletes, so future
 * terminal references stay intact.
 */
const deleteProductFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `products/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw productError(err, 'Failed to delete the product')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; modelName: string }) =>
      deleteProductFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Product “${input.modelName}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the product.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: productsQueryKey }),
  })
}
