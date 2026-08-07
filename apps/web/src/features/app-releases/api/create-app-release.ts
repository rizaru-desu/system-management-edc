import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  appReleaseError,
  appReleasesQueryKey,
  isDuplicateVersionError,
  toAppReleaseRecord,
} from './list-app-releases.ts'
import type { BackendAppRelease } from './list-app-releases.ts'
import type {
  AppReleasePlatform,
  AppReleaseRecord,
  AppReleaseUpdateType,
} from '../data/app-releases.ts'

/** The add/edit form's payload, in console field shapes. */
export interface AppReleasePayload {
  platform: AppReleasePlatform
  updateType: AppReleaseUpdateType
  versionName: string
  versionCode: number
  minimumVersion: string
  downloadUrl: string
  changelog: string
  fileSize: number
  checksum: string
  forceUpdate: boolean
  isActive: boolean
  channel: string
  runtimeVersion: string
  /** ISO timestamp; null keeps the release unstamped until publishing. */
  publishedAt: string | null
}

/** Console payload → the backend DTO (DB column names). */
export function toBackendPayload(payload: AppReleasePayload) {
  return {
    platform: payload.platform,
    updateType: payload.updateType,
    latestVersion: payload.versionName,
    versionCode: payload.versionCode,
    minimumVersion: payload.minimumVersion,
    downloadUrl: payload.downloadUrl,
    releaseNotes: payload.changelog,
    fileSize: payload.fileSize,
    checksum: payload.checksum,
    forceUpdate: payload.forceUpdate,
    isActive: payload.isActive,
    channel: payload.channel,
    runtimeVersion: payload.runtimeVersion,
    publishedAt: payload.publishedAt,
  }
}

/**
 * Creates a release through POST /app-releases (gated by the
 * app-releases-module "create" grant). When the new release is active the
 * backend deactivates the platform's previous live release atomically.
 */
const createAppReleaseFn = createServerFn({ method: 'POST' })
  .validator((input: AppReleasePayload) => input)
  .handler(async ({ data }): Promise<AppReleaseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendAppRelease>(
        'app-releases',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toAppReleaseRecord(response.data)
    } catch (err: unknown) {
      throw appReleaseError(err, 'Failed to create the release')
    }
  })

/**
 * Mutation for the add form. Creation is pessimistic (the server mints the
 * id), so the list refetches on settle; success and failure both surface as
 * toasts.
 */
export function useCreateAppRelease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AppReleasePayload) =>
      createAppReleaseFn({ data: input }),
    onSuccess: () => {
      toast.success('Release created successfully.')
    },
    onError: (error) => {
      if (isDuplicateVersionError(error)) {
        toast.error('Release version already exists.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the release.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: appReleasesQueryKey }),
  })
}
