import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { warehouseError, warehousesQueryKey } from './warehouse-tree.ts'

/**
 * Deletes a warehouse through DELETE /warehouses/:id (gated by the
 * warehouses-module "delete" grant). The backend soft-deletes and refuses
 * while child warehouses exist; that 409 message surfaces as-is.
 */
const deleteWarehouseFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `warehouses/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw warehouseError(err, 'Failed to delete the warehouse')
    }
  })

/** Mutation for the delete dialog; the tree refetches on settle. */
export function useDeleteWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteWarehouseFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Warehouse “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the warehouse.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  })
}
