import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  appReleaseError,
  appReleasesQueryKey,
  toAppReleaseRecord,
} from './list-app-releases.ts'
import type { BackendAppRelease } from './list-app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

/**
 * Publishes or unpublishes a release through PATCH /app-releases/:id/publish
 * (gated by the app-releases-module "update" grant). Publishing deactivates
 * the platform's current live release and stamps `publishedAt` when it was
 * never set — all inside one backend transaction.
 */
const publishAppReleaseFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; isActive: boolean }) => input)
  .handler(async ({ data }): Promise<AppReleaseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendAppRelease>(
        `app-releases/${encodeURIComponent(data.id)}/publish`,
        { isActive: data.isActive },
        { headers: { cookie } },
      )
      return toAppReleaseRecord(response.data)
    } catch (err: unknown) {
      throw appReleaseError(
        err,
        data.isActive
          ? 'Failed to publish the release'
          : 'Failed to unpublish the release',
      )
    }
  })

/**
 * Mutation for the publish/unpublish action. Pessimistic — the sibling
 * release turning inactive only materializes server-side, so the list
 * refetches on settle.
 */
export function useSetAppReleasePublished() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      publishAppReleaseFn({ data: input }),
    onSuccess: (release) => {
      toast.success(
        release.isActive
          ? `Release ${release.versionName} is now live.`
          : `Release ${release.versionName} unpublished.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the release status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: appReleasesQueryKey }),
  })
}
