import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-app-release.ts'
import type { AppReleasePayload } from './create-app-release.ts'
import {
  appReleaseError,
  appReleasesQueryKey,
  toAppReleaseRecord,
} from './list-app-releases.ts'
import type { BackendAppRelease } from './list-app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

export interface UpdateAppReleaseInput extends AppReleasePayload {
  id: string
}

/**
 * Saves the edit form through PATCH /app-releases/:id (gated by the
 * app-releases-module "update" grant). Activating a release deactivates the
 * platform's previous live release server-side.
 */
const updateAppReleaseFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateAppReleaseInput) => input)
  .handler(async ({ data }): Promise<AppReleaseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendAppRelease>(
        `app-releases/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toAppReleaseRecord(response.data)
    } catch (err: unknown) {
      throw appReleaseError(err, 'Failed to update the release')
    }
  })

/**
 * Mutation for the edit form. Updates are pessimistic — activation side
 * effects (the previously live release turning inactive) only materialize
 * server-side, so the list refetches on settle rather than being patched.
 */
export function useUpdateAppRelease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAppReleaseInput) =>
      updateAppReleaseFn({ data: input }),
    onSuccess: (release) => {
      toast.success(`Release ${release.versionName} updated.`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update the release.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: appReleasesQueryKey }),
  })
}
