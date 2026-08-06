import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { appReleasesQueryKey } from './list-app-releases.ts'
import type {
  AppReleasePlatform,
  AppReleaseUpdateType,
} from '../data/app-releases.ts'

export interface ReleaseVersionIdentity {
  platform: AppReleasePlatform
  updateType: AppReleaseUpdateType
  versionName: string
  versionCode: number
  /** The record being edited, skipped by the check. */
  excludeId?: string
}

/**
 * Probes GET /app-releases/check-availability for the form's live duplicate
 * warning. Advisory only — create/update still enforce the check (plus the
 * unique index) server-side — so a failed probe reports "available" rather
 * than blocking the form.
 */
const checkReleaseVersion = createServerFn({ method: 'GET' })
  .validator((input: ReleaseVersionIdentity) => input)
  .handler(async ({ data }): Promise<{ available: boolean }> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { available: true }

    try {
      const response = await apiClient.get<{ available: boolean }>(
        'app-releases/check-availability',
        {
          headers: { cookie },
          params: {
            platform: data.platform,
            updateType: data.updateType,
            latestVersion: data.versionName,
            versionCode: data.versionCode,
            ...(data.excludeId ? { excludeId: data.excludeId } : undefined),
          },
        },
      )
      return { available: response.data.available }
    } catch {
      return { available: true }
    }
  })

export const releaseVersionAvailabilityQueryOptions = (
  identity: ReleaseVersionIdentity,
) =>
  queryOptions({
    queryKey: [
      ...appReleasesQueryKey,
      'availability',
      identity.platform,
      identity.updateType,
      identity.versionName,
      identity.versionCode,
      identity.excludeId ?? null,
    ],
    queryFn: () => checkReleaseVersion({ data: identity }),
    staleTime: 10_000,
  })
