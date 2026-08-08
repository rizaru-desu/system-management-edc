import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { accountError, accountsQueryKey } from './list-accounts.ts'

/**
 * Deletes an account through DELETE /accounts/:id (gated by the
 * accounts-module "delete" grant). Soft delete server-side — the row stays
 * in place for referencing history.
 */
const deleteAccountFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `accounts/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw accountError(err, 'Failed to delete the account')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteAccountFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Account “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the account.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}
