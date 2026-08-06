import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { patchMerchant } from './mock-backend.ts'
import type { MerchantPayload } from './mock-backend.ts'
import { merchantsQueryKey } from './list-merchants.ts'

/**
 * Mutation for the edit form. UI-only: swap `patchMerchant` for the
 * PATCH /merchants/:id call when the backend lands.
 */
export function useUpdateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: MerchantPayload & { id: string }) =>
      patchMerchant(id, payload),
    onSuccess: (merchant) => {
      toast.success(`Merchant “${merchant.name}” updated.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the merchant.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey }),
  })
}
