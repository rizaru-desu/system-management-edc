import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { removeMerchant } from './mock-backend.ts'
import { merchantsQueryKey } from './list-merchants.ts'

/**
 * Mutation for the table's Delete action. UI-only: swap `removeMerchant` for
 * the DELETE /merchants/:id call when the backend lands.
 */
export function useDeleteMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      removeMerchant(input.id),
    onSuccess: (_, input) => {
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
