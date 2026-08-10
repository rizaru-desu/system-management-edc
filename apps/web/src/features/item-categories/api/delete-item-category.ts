import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  itemCategoriesQueryKey,
  itemCategoryError,
} from './list-item-categories.ts'

/**
 * Deletes an item category through DELETE /item-categories/:id (gated by
 * the item-categories-module "delete" grant). The backend soft-deletes, so
 * future product references stay intact.
 */
const deleteItemCategoryFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `item-categories/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw itemCategoryError(err, 'Failed to delete the item')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteItemCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteItemCategoryFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Item “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete the item.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: itemCategoriesQueryKey }),
  })
}
