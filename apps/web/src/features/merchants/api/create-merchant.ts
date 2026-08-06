import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { insertMerchant } from './mock-backend.ts'
import type { MerchantPayload } from './mock-backend.ts'
import { merchantsQueryKey } from './list-merchants.ts'

/**
 * Mutation for the add form. Creation is pessimistic (the store mints the
 * id), so the list refetches on settle; success and failure both surface as
 * toasts. UI-only: swap `insertMerchant` for the POST /merchants call when
 * the backend lands.
 */
export function useCreateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MerchantPayload) => insertMerchant(input),
    onSuccess: (merchant) => {
      toast.success(`Merchant “${merchant.name}” created.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the merchant.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey }),
  })
}
