import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  accountError,
  accountsQueryKey,
  isDuplicateAccountIdError,
  toAccountRecord,
  toBackendStatus,
  toBackendType,
} from './list-accounts.ts'
import type { BackendAccount } from './list-accounts.ts'
import type {
  AccountRecord,
  AccountStatus,
  AccountType,
} from '../data/accounts.ts'

/** The add/edit form's payload, in frontend field shapes. */
export interface AccountPayload {
  accountId: string
  name: string
  type: AccountType
  status: AccountStatus
  billingName: string | null
  taxId: string | null
  billingAddress: string | null
  city: string | null
  region: string | null
  picName: string | null
  picPhone: string | null
  picEmail: string | null
}

/** Frontend payload → the backend DTO (column names + uppercase enums). */
export function toBackendPayload(payload: AccountPayload) {
  return {
    accountId: payload.accountId,
    accountName: payload.name,
    accountType: toBackendType(payload.type),
    status: toBackendStatus(payload.status),
    billingName: payload.billingName,
    taxId: payload.taxId,
    billingAddress: payload.billingAddress,
    city: payload.city,
    region: payload.region,
    picName: payload.picName,
    picPhone: payload.picPhone,
    picEmail: payload.picEmail,
  }
}

/**
 * Creates an account through POST /accounts (gated by the accounts-module
 * "create" grant). Business-id uniqueness is validated server-side;
 * 409 = account ID already in use.
 */
const createAccountFn = createServerFn({ method: 'POST' })
  .validator((input: AccountPayload) => input)
  .handler(async ({ data }): Promise<AccountRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendAccount>(
        'accounts',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toAccountRecord(response.data)
    } catch (err: unknown) {
      throw accountError(err, 'Failed to create the account')
    }
  })

/**
 * Mutation for the add form. Creation is pessimistic (the server mints the
 * id), so the list refetches on settle; success and failure both surface as
 * toasts. A duplicate-id 409 additionally gets an inline highlight via the
 * form's conflict counter (see the page).
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountPayload) => createAccountFn({ data: input }),
    onSuccess: (account) => {
      toast.success(`Account “${account.name}” created.`)
    },
    onError: (error) => {
      if (isDuplicateAccountIdError(error)) {
        toast.error('Account ID is already in use.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the account.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}
