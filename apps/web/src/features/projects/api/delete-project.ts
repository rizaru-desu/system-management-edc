import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { projectError, projectsQueryKey } from './list-projects.ts'

/**
 * Deletes a project through DELETE /projects/:id (gated by the
 * projects-module "delete" grant). Soft delete server-side — the row stays
 * in place for referencing history.
 */
const deleteProjectFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.delete<{ id: string }>(
        `projects/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw projectError(err, 'Failed to delete the project')
    }
  })

/** Mutation for the delete dialog; the list refetches on settle. */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteProjectFn({ data: { id: input.id } }),
    onSuccess: (_result, input) => {
      toast.success(`Project “${input.name}” deleted.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the project.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  })
}
