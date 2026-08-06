import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  AppReleasePlatform,
  AppReleaseRecord,
  AppReleaseUpdateType,
} from '../data/app-releases.ts'

/** Row shape returned by the backend's /app-releases endpoints. */
export interface BackendAppRelease {
  id: string
  platform: string
  updateType: string
  latestVersion: string
  versionCode: number
  minimumVersion: string
  forceUpdate: boolean
  updateUrl: string
  downloadUrl: string
  checksum: string
  fileSize: number
  releaseNotes: string
  channel: string
  runtimeVersion: string
  publishedAt: string | null
  isActive: boolean
  isLatest: boolean
  createdAt: string
  updatedAt: string
}

/** Backend row → the console record (DB column names → console names). */
export function toAppReleaseRecord(row: BackendAppRelease): AppReleaseRecord {
  return {
    id: row.id,
    platform: row.platform === 'ios' ? 'ios' : 'android',
    updateType: row.updateType === 'ota' ? 'ota' : 'apk',
    versionName: row.latestVersion,
    versionCode: row.versionCode,
    minimumVersion: row.minimumVersion,
    downloadUrl: row.downloadUrl || row.updateUrl,
    changelog: row.releaseNotes,
    fileSize: row.fileSize,
    checksum: row.checksum,
    forceUpdate: row.forceUpdate,
    isActive: row.isActive,
    isLatest: row.isLatest,
    channel: row.channel || 'production',
    runtimeVersion: row.runtimeVersion || '1.0.0',
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function appReleaseError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage app releases.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the release list plus the filtered total row count. */
export interface AppReleasesListPage {
  releases: Array<AppReleaseRecord>
  total: number
}

export interface AppReleasesQueryFilters {
  search?: string
  platform?: AppReleasePlatform | 'all'
  updateType?: AppReleaseUpdateType | 'all'
  status?: 'active' | 'inactive' | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of releases from GET /app-releases (gated by the
 * app-releases-module "view" grant). Search, platform/type/status filters
 * and pagination all happen server-side; the response carries the page rows
 * plus the total count matching the filters. Cookies are forwarded manually
 * for the same SSR reason as the users feature (they are httpOnly).
 */
const fetchAppReleases = createServerFn({ method: 'GET' })
  .validator((input: AppReleasesQueryFilters) => input)
  .handler(async ({ data }): Promise<AppReleasesListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { releases: [], total: 0 }

    try {
      const response = await apiClient.get<{
        releases: Array<BackendAppRelease>
        total: number
      }>('app-releases', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.platform && data.platform !== 'all'
            ? { platform: data.platform }
            : undefined),
          ...(data.updateType && data.updateType !== 'all'
            ? { updateType: data.updateType }
            : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: data.status }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        releases: response.data.releases.map(toAppReleaseRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw appReleaseError(err, 'Failed to load app releases')
    }
  })

/** Base key shared by every app release query (list, detail). */
export const appReleasesQueryKey = ['app-releases'] as const

export const appReleasesListQueryKey = [...appReleasesQueryKey, 'list'] as const

export const appReleasesListQueryOptions = ({
  search = '',
  platform = 'all',
  updateType = 'all',
  status = 'all',
  page = 1,
  pageSize = 50,
}: AppReleasesQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...appReleasesListQueryKey,
      search.trim(),
      platform,
      updateType,
      status,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchAppReleases({
        data: { search, platform, updateType, status, page, pageSize },
      }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
