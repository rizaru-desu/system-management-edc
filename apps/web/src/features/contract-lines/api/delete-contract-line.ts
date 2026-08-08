import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { accountsQueryKey } from '#/features/accounts/index.ts'
import { projectsQueryKey } from '#/features/projects/index.ts'
import {
  contractLineError,
  contractLinesQueryKey,
} from './list-contract-lines.ts'

/**
 * Deletes a contract line through DELETE /contract-lines/:id (gated by the
 * contract-lines-module "delete" grant). Soft delete server-side — the row
 * stays in place for referencing history.
 */
const deleteContractLineFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `contract-lines/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw contractLineError(err, 'Failed to delete the contract line')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteContractLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteContractLineFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Contract line “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the contract line.',
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: contractLinesQueryKey })
      // Contract line writes change the aggregated counts shown on the
      // accounts and projects lists — refresh them too.
      void queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}
