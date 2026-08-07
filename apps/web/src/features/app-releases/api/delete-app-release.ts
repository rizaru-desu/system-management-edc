import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { appReleaseError, appReleasesQueryKey } from './list-app-releases.ts'

/**
 * Deletes a release through DELETE /app-releases/:id (gated by the
 * app-releases-module "delete" grant). Hard delete — the confirmation
 * dialog is the only safety net.
 */
const deleteAppReleaseFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `app-releases/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw appReleaseError(err, 'Failed to delete the release')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteAppRelease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; versionName: string }) =>
      deleteAppReleaseFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Release ${input.versionName} deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the release.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: appReleasesQueryKey }),
  })
}
