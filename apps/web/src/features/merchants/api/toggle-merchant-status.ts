import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { patchMerchantStatus } from './mock-backend.ts'
import { merchantsQueryKey } from './list-merchants.ts'
import type { MerchantStatus } from '../data/merchants.ts'

/**
 * Mutation for the table's Activate/Deactivate action. UI-only: swap
 * `patchMerchantStatus` for the PATCH /merchants/:id/status call when the
 * backend lands.
 */
export function useSetMerchantStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: MerchantStatus }) =>
      patchMerchantStatus(input.id, input.status),
    onSuccess: (merchant) => {
      toast.success(
        merchant.status === 'active'
          ? `Merchant “${merchant.name}” activated.`
          : `Merchant “${merchant.name}” deactivated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the merchant status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey }),
  })
}
