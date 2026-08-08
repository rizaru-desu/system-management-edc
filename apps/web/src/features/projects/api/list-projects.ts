import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type { ProjectRecord, ProjectStatus } from '../data/projects.ts'

/** Row shape returned by the backend's /projects endpoints. */
export interface BackendProject {
  id: string
  projectCode: string
  projectName: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

/** Backend row → the console record (DB column names → console names). */
export function toProjectRecord(row: BackendProject): ProjectRecord {
  return {
    id: row.id,
    code: row.projectCode,
    name: row.projectName,
    description: row.description,
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Maps a frontend status filter/value onto the backend's uppercase enum. */
export function toBackendStatus(status: ProjectStatus): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/**
 * True when the error is the backend's 409 for a duplicate project code.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateCodeError(error: unknown): boolean {
  return error instanceof Error && /already in use/i.test(error.message)
}

export function projectError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(detail || 'You do not have permission to manage projects.')
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the project list plus the filtered total row count. */
export interface ProjectsListPage {
  projects: Array<ProjectRecord>
  total: number
}

export interface ProjectsQueryFilters {
  search?: string
  status?: ProjectStatus | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of projects from GET /projects (gated by the
 * projects-module "view" grant). Search, status filter and pagination all
 * happen server-side; the response carries the page rows plus the total
 * count matching the filters. Cookies are forwarded manually for the same
 * SSR reason as the users feature (they are httpOnly).
 */
const fetchProjects = createServerFn({ method: 'GET' })
  .validator((input: ProjectsQueryFilters) => input)
  .handler(async ({ data }): Promise<ProjectsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { projects: [], total: 0 }

    try {
      const response = await apiClient.get<{
        projects: Array<BackendProject>
        total: number
      }>('projects', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        projects: response.data.projects.map(toProjectRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw projectError(err, 'Failed to load projects')
    }
  })

/** Base key shared by every project query (list, detail). */
export const projectsQueryKey = ['projects'] as const

export const projectsListQueryKey = [...projectsQueryKey, 'list'] as const

export const projectsListQueryOptions = ({
  search = '',
  status = 'all',
  page = 1,
  pageSize = 50,
}: ProjectsQueryFilters = {}) =>
  queryOptions({
    queryKey: [...projectsListQueryKey, search.trim(), status, page, pageSize],
    queryFn: () => fetchProjects({ data: { search, status, page, pageSize } }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
