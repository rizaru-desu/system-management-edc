import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient, type ApiError } from '#/lib/api-client.ts'
import type { RoleKey } from '#/features/console/index.ts'
import type { UserRecord } from '../data/users.ts'

/** Row shape returned by the backend's QUERY /users (see users.service.ts). */
export interface BackendUser {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  /** Why the account was deactivated; null when active or never recorded. */
  banReason: string | null
  createdAt: string
  /** Most recent session activity; null when the user has never signed in. */
  lastActiveAt: string | null
  /** IP address of that most recent session; null when never signed in. */
  lastIpAddress: string | null
  /** User agent of that most recent session; null when never signed in. */
  lastUserAgent: string | null
  /** Distinct linked auth providers, e.g. ["credential"], ["ldap"]. */
  providers: Array<string>
}

function toIsoDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10)
}

export function toUserRecord(user: BackendUser): UserRecord {
  // `user.role` stores role keys verbatim, comma-separated for multi-role
  // accounts (Better Auth admin plugin style). Every stored key becomes a
  // tag — keys outside the console catalogue (e.g. the default `user` role)
  // render with RoleBadge's fallback styling instead of being dropped, so
  // the list always mirrors the database.
  const roles = (user.role ?? '')
    .split(',')
    .map((role) => role.trim())
    .filter((role) => role.length > 0)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles,
    status: user.banned ? 'inactive' : 'active',
    banReason: user.banned ? user.banReason : null,
    // Newest session per user (see @repo/db listUsers); the table renders it
    // as a relative time with the session's device/IP underneath.
    lastActiveAt: user.lastActiveAt,
    lastIp: user.lastIpAddress,
    lastUserAgent: user.lastUserAgent,
    signInMethods: user.providers,
    createdAt: toIsoDate(user.createdAt),
  }
}

/** One page of the console user list plus the filtered total row count. */
export interface UsersListPage {
  users: Array<UserRecord>
  total: number
}

/**
 * Fetches one page of console users from the backend's QUERY /users endpoint
 * (gated by the users-module "view" grant; System Administrators always
 * pass), optionally live-filtered by a case-insensitive name/email search
 * and/or a role. Filters travel as a JSON body — HTTP QUERY (RFC 10008) is
 * safe/idempotent like GET but bodied like POST, so the filter shape can
 * grow without URL-length limits. Pagination happens server-side: the
 * response carries the page rows plus the total count matching the filters.
 * Cookies are forwarded manually for the same reason as
 * `features/auth/api/session.ts`: they are httpOnly, so during SSR the
 * browser's fetch credentials are unavailable.
 */
const fetchUsers = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      search?: string
      role?: string
      page?: number
      pageSize?: number
    }) => ({
      search: typeof input.search === 'string' ? input.search.trim() : '',
      role: typeof input.role === 'string' ? input.role.trim() : '',
      page: typeof input.page === 'number' ? input.page : 1,
      pageSize: typeof input.pageSize === 'number' ? input.pageSize : 50,
    }),
  )
  .handler(async ({ data }): Promise<UsersListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { users: [], total: 0 }

    try {
      const response = await apiClient.request<{
        users: Array<BackendUser>
        total: number
      }>({
        url: 'users',
        method: 'QUERY',
        headers: { cookie },
        data: {
          ...(data.search ? { search: data.search } : undefined),
          ...(data.role ? { role: data.role } : undefined),
          page: data.page,
          pageSize: data.pageSize,
        },
      })
      const page = response.data
      return { users: page.users.map(toUserRecord), total: page.total }
    } catch (err: unknown) {
      const apiErr = err as ApiError
      const status = apiErr?.status
      throw new Error(
        status === 401 || status === 403
          ? 'You need the System Administrator role to view users.'
          : apiErr?.message || `Failed to load users (HTTP ${status}).`,
      )
    }
  })

export const usersQueryKey = ['users', 'list'] as const

export interface UsersQueryFilters {
  search?: string
  role?: RoleKey | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

export const usersQueryOptions = ({
  search = '',
  role = 'all',
  page = 1,
  pageSize = 50,
}: UsersQueryFilters = {}) => {
  // Role keys are stored verbatim in `user.role`, so the filter passes the
  // console key straight through.
  const backendRole = role === 'all' ? '' : role

  return queryOptions({
    queryKey: [...usersQueryKey, search.trim(), backendRole, page, pageSize],
    queryFn: () =>
      fetchUsers({ data: { search, role: backendRole, page, pageSize } }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
}
