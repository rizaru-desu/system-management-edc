import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  PaymentMethodRecord,
  PaymentMethodStatus,
} from '../data/payment-methods.ts'

/** Row shape returned by the backend's /payment-methods endpoints. */
export interface BackendPaymentMethod {
  id: string
  name: string
  code: string | null
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  productUsageCount: number
  createdAt: string
  updatedAt: string
}

/** Backend row → the console record (uppercase enums → console values). */
export function toPaymentMethodRecord(
  row: BackendPaymentMethod,
): PaymentMethodRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? '',
    description: row.description ?? '',
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    productUsageCount: row.productUsageCount,
  }
}

/**
 * True when the error is the backend's 409 for a name/code already in
 * use. Matched on the message because server-function errors cross the
 * SSR boundary as plain Errors.
 */
export function isDuplicateNameError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /method with this name already exists/i.test(error.message)
  )
}

export function isDuplicateCodeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /method with this code already exists/i.test(error.message)
  )
}

export function paymentMethodError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage payment methods.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

// ─── List ──────────────────────────────────────────────────────────────────

export interface PaymentMethodsListPage {
  paymentMethods: Array<PaymentMethodRecord>
  total: number
}

export interface PaymentMethodsQueryFilters {
  search?: string
  status?: PaymentMethodStatus | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of payment methods from GET /payment-methods (gated by
 * the module's "view" grant). Search, status filter and pagination all run
 * server-side; the products-using count comes joined. Cookies are
 * forwarded manually for the same SSR reason as the users feature.
 */
const fetchPaymentMethods = createServerFn({ method: 'GET' })
  .validator((input: PaymentMethodsQueryFilters) => input)
  .handler(async ({ data }): Promise<PaymentMethodsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { paymentMethods: [], total: 0 }

    try {
      const response = await apiClient.get<{
        paymentMethods: Array<BackendPaymentMethod>
        total: number
      }>('payment-methods', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: data.status === 'active' ? 'ACTIVE' : 'INACTIVE' }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        paymentMethods: response.data.paymentMethods.map(toPaymentMethodRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw paymentMethodError(err, 'Failed to load the payment methods')
    }
  })

/** Base key shared by every payment-methods query. */
export const paymentMethodsQueryKey = ['payment-methods'] as const

export const paymentMethodsListQueryOptions = ({
  search = '',
  status = 'all',
  page = 1,
  pageSize = 50,
}: PaymentMethodsQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...paymentMethodsQueryKey,
      'list',
      search.trim(),
      status,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchPaymentMethods({ data: { search, status, page, pageSize } }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

// ─── Mutations ─────────────────────────────────────────────────────────────

/** The form's payload in backend shape. */
export interface PaymentMethodPayload {
  name: string
  code: string | null
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

const createPaymentMethodFn = createServerFn({ method: 'POST' })
  .validator((input: PaymentMethodPayload) => input)
  .handler(async ({ data }): Promise<PaymentMethodRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendPaymentMethod>(
        'payment-methods',
        data,
        { headers: { cookie } },
      )
      return toPaymentMethodRecord(response.data)
    } catch (err: unknown) {
      throw paymentMethodError(err, 'Failed to create the payment method')
    }
  })

const updatePaymentMethodFn = createServerFn({ method: 'POST' })
  .validator((input: PaymentMethodPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<PaymentMethodRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendPaymentMethod>(
        `payment-methods/${encodeURIComponent(id)}`,
        payload,
        { headers: { cookie } },
      )
      return toPaymentMethodRecord(response.data)
    } catch (err: unknown) {
      throw paymentMethodError(err, 'Failed to update the payment method')
    }
  })

const togglePaymentMethodFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<PaymentMethodRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendPaymentMethod>(
        `payment-methods/${encodeURIComponent(data.id)}/toggle-status`,
        {},
        { headers: { cookie } },
      )
      return toPaymentMethodRecord(response.data)
    } catch (err: unknown) {
      throw paymentMethodError(err, 'Failed to toggle the payment method')
    }
  })

const deletePaymentMethodFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `payment-methods/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw paymentMethodError(err, 'Failed to delete the payment method')
    }
  })

function mutationErrorToast(error: unknown, fallback: string) {
  if (isDuplicateNameError(error)) {
    toast.error('A payment method with this name already exists.')
    return
  }
  if (isDuplicateCodeError(error)) {
    toast.error('A payment method with this code already exists.')
    return
  }
  toast.error(error instanceof Error ? error.message : fallback)
}

/** Mutation for the create form; the list refetches on settle. */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentMethodPayload) =>
      createPaymentMethodFn({ data: input }),
    onSuccess: (method) => {
      toast.success(`Payment method “${method.name}” created.`)
    },
    onError: (error) =>
      mutationErrorToast(error, 'Failed to create the payment method.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey }),
  })
}

/** Mutation for the edit form; the list refetches on settle. */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentMethodPayload & { id: string }) =>
      updatePaymentMethodFn({ data: input }),
    onSuccess: (method) => {
      toast.success(`Payment method “${method.name}” updated.`)
    },
    onError: (error) =>
      mutationErrorToast(error, 'Failed to update the payment method.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey }),
  })
}

/** The table's quick status toggle. */
export function useTogglePaymentMethodStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      togglePaymentMethodFn({ data: input }),
    onSuccess: (method) => {
      toast.success(
        `Payment method “${method.name}” is now ${method.status === 'active' ? 'active' : 'inactive'}.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to toggle the payment method.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey }),
  })
}

/** Delete — the backend refuses while any live product links the method. */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      deletePaymentMethodFn({ data: input }),
    onSuccess: () => {
      toast.success('Payment method deleted.')
    },
    onError: (error) => {
      // The in-use rejection carries the product count — surface verbatim.
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the payment method.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey }),
  })
}
