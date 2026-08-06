import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { merchantError, merchantsQueryKey } from './list-merchants.ts'

/**
 * Deletes a merchant through DELETE /merchants/:id (gated by the
 * merchants-module "delete" grant). Soft delete server-side — the row stays
 * in place for referencing history.
 */
const deleteMerchantFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `merchants/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to delete the merchant')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteMerchantFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Merchant “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the merchant.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey }),
  })
}
