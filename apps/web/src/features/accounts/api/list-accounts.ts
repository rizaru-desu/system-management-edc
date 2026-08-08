import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  AccountRecord,
  AccountStatus,
  AccountType,
} from '../data/accounts.ts'

/** Backend enum values of the account type (display labels stay title-case). */
export type BackendAccountType = 'CORPORATE' | 'BRANCH' | 'AGGREGATOR'

/** Row shape returned by the backend's /accounts endpoints. */
export interface BackendAccount {
  id: string
  accountId: string
  accountName: string
  accountType: BackendAccountType
  status: 'ACTIVE' | 'INACTIVE'
  billingName: string | null
  taxId: string | null
  billingAddress: string | null
  city: string | null
  region: string | null
  picName: string | null
  picPhone: string | null
  picEmail: string | null
  createdAt: string
  updatedAt: string
}

const TYPE_LABELS: Record<BackendAccountType, AccountType> = {
  CORPORATE: 'Corporate',
  BRANCH: 'Branch',
  AGGREGATOR: 'Aggregator',
}

/** Backend row → the console record (DB column names → console names). */
export function toAccountRecord(row: BackendAccount): AccountRecord {
  return {
    id: row.id,
    accountId: row.accountId,
    name: row.accountName,
    type: TYPE_LABELS[row.accountType],
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    billingName: row.billingName,
    taxId: row.taxId,
    billingAddress: row.billingAddress,
    city: row.city,
    region: row.region,
    picName: row.picName,
    picPhone: row.picPhone,
    picEmail: row.picEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Maps a frontend status filter/value onto the backend's uppercase enum. */
export function toBackendStatus(status: AccountStatus): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/** Maps a frontend type label onto the backend's uppercase enum. */
export function toBackendType(type: AccountType): BackendAccountType {
  return type.toUpperCase() as BackendAccountType
}

/**
 * True when the error is the backend's 409 for a duplicate account ID.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateAccountIdError(error: unknown): boolean {
  return error instanceof Error && /already in use/i.test(error.message)
}

export function accountError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(detail || 'You do not have permission to manage accounts.')
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the account list plus the filtered total row count. */
export interface AccountsListPage {
  accounts: Array<AccountRecord>
  total: number
}

export interface AccountsQueryFilters {
  search?: string
  type?: AccountType | 'all'
  status?: AccountStatus | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of accounts from GET /accounts (gated by the
 * accounts-module "view" grant). Search, type/status filters and pagination
 * all happen server-side; the response carries the page rows plus the total
 * count matching the filters. Cookies are forwarded manually for the same
 * SSR reason as the users feature (they are httpOnly).
 */
const fetchAccounts = createServerFn({ method: 'GET' })
  .validator((input: AccountsQueryFilters) => input)
  .handler(async ({ data }): Promise<AccountsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { accounts: [], total: 0 }

    try {
      const response = await apiClient.get<{
        accounts: Array<BackendAccount>
        total: number
      }>('accounts', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.type && data.type !== 'all'
            ? { accountType: toBackendType(data.type) }
            : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        accounts: response.data.accounts.map(toAccountRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw accountError(err, 'Failed to load accounts')
    }
  })

/** Base key shared by every account query (list, detail). */
export const accountsQueryKey = ['accounts'] as const

export const accountsListQueryKey = [...accountsQueryKey, 'list'] as const

export const accountsListQueryOptions = ({
  search = '',
  type = 'all',
  status = 'all',
  page = 1,
  pageSize = 50,
}: AccountsQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...accountsListQueryKey,
      search.trim(),
      type,
      status,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchAccounts({ data: { search, type, status, page, pageSize } }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
