import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-merchant.ts'
import type { MerchantPayload } from './create-merchant.ts'
import {
  isDuplicateCodeError,
  merchantError,
  merchantsQueryKey,
  toBackendStatus,
  toMerchantRecord,
} from './list-merchants.ts'
import type { BackendMerchant } from './list-merchants.ts'
import type { MerchantRecord, MerchantStatus } from '../data/merchants.ts'

/**
 * Updates a merchant through PATCH /merchants/:id (gated by the
 * merchants-module "update" grant). Code uniqueness and service point
 * existence are re-validated server-side.
 */
const updateMerchantFn = createServerFn({ method: 'POST' })
  .validator((input: MerchantPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<MerchantRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendMerchant>(
        `merchants/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toMerchantRecord(response.data)
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to update the merchant')
    }
  })

/** Mutation for the edit form; the list refetches on settle. */
export function useUpdateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MerchantPayload & { id: string }) =>
      updateMerchantFn({ data: input }),
    onSuccess: (merchant) => {
      toast.success(`Merchant “${merchant.name}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateCodeError(error)) {
        toast.error('Merchant code is already in use.')
        return
      }
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

/**
 * Status-only PATCH for the table's Activate/Deactivate action — same
 * endpoint as the edit form, but a dedicated server fn so the request body
 * carries nothing except the status flip.
 */
const setMerchantStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; status: MerchantStatus }) => input)
  .handler(async ({ data }): Promise<MerchantRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendMerchant>(
        `merchants/${encodeURIComponent(data.id)}`,
        { status: toBackendStatus(data.status) },
        { headers: { cookie } },
      )
      return toMerchantRecord(response.data)
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to change the merchant status')
    }
  })

/** Mutation for the Activate/Deactivate dialog; the list refetches on settle. */
export function useSetMerchantStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: MerchantStatus }) =>
      setMerchantStatusFn({ data: input }),
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
