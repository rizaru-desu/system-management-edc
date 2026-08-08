import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-account.ts'
import type { AccountPayload } from './create-account.ts'
import {
  accountError,
  accountsQueryKey,
  isDuplicateAccountIdError,
  toAccountRecord,
  toBackendStatus,
} from './list-accounts.ts'
import type { BackendAccount } from './list-accounts.ts'
import type { AccountRecord, AccountStatus } from '../data/accounts.ts'

/**
 * Updates an account through PATCH /accounts/:id (gated by the
 * accounts-module "update" grant). Business-id uniqueness is re-validated
 * server-side.
 */
const updateAccountFn = createServerFn({ method: 'POST' })
  .validator((input: AccountPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<AccountRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendAccount>(
        `accounts/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toAccountRecord(response.data)
    } catch (err: unknown) {
      throw accountError(err, 'Failed to update the account')
    }
  })

/** Mutation for the edit form; the list refetches on settle. */
export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountPayload & { id: string }) =>
      updateAccountFn({ data: input }),
    onSuccess: (account) => {
      toast.success(`Account “${account.name}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateAccountIdError(error)) {
        toast.error('Account ID is already in use.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the account.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}

/**
 * Status-only PATCH for the table's Activate/Deactivate action — same
 * endpoint as the edit form, but a dedicated server fn so the request body
 * carries nothing except the status flip.
 */
const setAccountStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; status: AccountStatus }) => input)
  .handler(async ({ data }): Promise<AccountRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendAccount>(
        `accounts/${encodeURIComponent(data.id)}`,
        { status: toBackendStatus(data.status) },
        { headers: { cookie } },
      )
      return toAccountRecord(response.data)
    } catch (err: unknown) {
      throw accountError(err, 'Failed to change the account status')
    }
  })

/** Mutation for the Activate/Deactivate dialog; the list refetches on settle. */
export function useSetAccountStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: AccountStatus }) =>
      setAccountStatusFn({ data: input }),
    onSuccess: (account) => {
      toast.success(
        account.status === 'active'
          ? `Account “${account.name}” activated.`
          : `Account “${account.name}” deactivated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the account status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}
