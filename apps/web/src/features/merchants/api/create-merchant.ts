import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateCodeError,
  merchantError,
  merchantsQueryKey,
  toBackendStatus,
  toMerchantRecord,
} from './list-merchants.ts'
import type { BackendMerchant } from './list-merchants.ts'
import type { MerchantRecord, MerchantStatus } from '../data/merchants.ts'

/** The add/edit form's payload, in frontend field shapes. */
export interface MerchantPayload {
  code: string
  name: string
  type: string | null
  picName: string | null
  phone: string | null
  email: string | null
  address: string | null
  province: string | null
  city: string | null
  district: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  servicePointId: string
  status: MerchantStatus
}

/** Frontend payload → the backend DTO (column names + uppercase status). */
export function toBackendPayload(payload: MerchantPayload) {
  return {
    merchantCode: payload.code,
    merchantName: payload.name,
    merchantType: payload.type,
    picName: payload.picName,
    phoneNumber: payload.phone,
    email: payload.email,
    address: payload.address,
    province: payload.province,
    city: payload.city,
    district: payload.district,
    postalCode: payload.postalCode,
    latitude: payload.latitude,
    longitude: payload.longitude,
    servicePointId: payload.servicePointId,
    status: toBackendStatus(payload.status),
  }
}

/**
 * Creates a merchant through POST /merchants (gated by the merchants-module
 * "create" grant). Code uniqueness and service point existence are validated
 * server-side; 409 = merchant code already in use.
 */
const createMerchantFn = createServerFn({ method: 'POST' })
  .validator((input: MerchantPayload) => input)
  .handler(async ({ data }): Promise<MerchantRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendMerchant>(
        'merchants',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toMerchantRecord(response.data)
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to create the merchant')
    }
  })

/**
 * Mutation for the add form. Creation is pessimistic (the server mints the
 * id), so the list refetches on settle; success and failure both surface as
 * toasts. A duplicate-code 409 additionally gets an inline highlight via
 * the form's conflict counter (see the page).
 */
export function useCreateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MerchantPayload) => createMerchantFn({ data: input }),
    onSuccess: (merchant) => {
      toast.success(`Merchant “${merchant.name}” created.`)
    },
    onError: (error) => {
      if (isDuplicateCodeError(error)) {
        toast.error('Merchant code is already in use.')
        return
      }
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
