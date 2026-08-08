import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  ContractLineRecord,
  ContractLineStatus,
  DocumentStatus,
} from '../data/contract-lines.ts'

/** Backend enum values of the document status (frontend keeps kebab-case). */
export type BackendDocumentStatus =
  | 'DRAFT'
  | 'DOCUMENT_VERIFICATION'
  | 'WRITING_HARDCOPY'
  | 'HARDCOPY_SENT'
  | 'SIGNED'
  | 'ARCHIVED'

/** Row shape returned by the backend's /contract-lines endpoints. */
export interface BackendContractLine {
  id: string
  lineNumber: string
  lineName: string
  status: 'ACTIVE' | 'INACTIVE'
  documentStatus: BackendDocumentStatus
  vendorEdc: string | null
  accountId: string
  accountCode: string
  accountName: string
  projectId: string
  projectCode: string
  projectName: string
  serviceItem: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const DOCUMENT_STATUS_FROM_BACKEND: Record<
  BackendDocumentStatus,
  DocumentStatus
> = {
  DRAFT: 'draft',
  DOCUMENT_VERIFICATION: 'document-verification',
  WRITING_HARDCOPY: 'writing-hardcopy',
  HARDCOPY_SENT: 'hardcopy-sent',
  SIGNED: 'signed',
  ARCHIVED: 'archived',
}

/** Backend row → the console record (DB column names → console names). */
export function toContractLineRecord(
  row: BackendContractLine,
): ContractLineRecord {
  return {
    id: row.id,
    lineNumber: row.lineNumber,
    name: row.lineName,
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    documentStatus: DOCUMENT_STATUS_FROM_BACKEND[row.documentStatus],
    vendorEdc: row.vendorEdc,
    accountId: row.accountId,
    accountLabel: `[${row.accountCode}] ${row.accountName}`,
    projectId: row.projectId,
    projectLabel: `[${row.projectCode}] ${row.projectName}`,
    serviceItem: row.serviceItem,
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Maps a frontend status filter/value onto the backend's uppercase enum. */
export function toBackendStatus(
  status: ContractLineStatus,
): 'ACTIVE' | 'INACTIVE' {
  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

/** Maps a frontend document status onto the backend's uppercase enum. */
export function toBackendDocumentStatus(
  status: DocumentStatus,
): BackendDocumentStatus {
  return status.toUpperCase().replace(/-/g, '_') as BackendDocumentStatus
}

/**
 * True when the error is the backend's 409 for a duplicate line number.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateLineNumberError(error: unknown): boolean {
  return error instanceof Error && /already in use/i.test(error.message)
}

export function contractLineError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage contract lines.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the contract line list plus the filtered total row count. */
export interface ContractLinesListPage {
  contractLines: Array<ContractLineRecord>
  total: number
}

export interface ContractLinesQueryFilters {
  search?: string
  status?: ContractLineStatus | 'all'
  documentStatus?: DocumentStatus | 'all'
  /** Lines belonging to this account only (database cuid). */
  accountId?: string
  /** Lines belonging to this project only (database cuid). */
  projectId?: string
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of contract lines from GET /contract-lines (gated by
 * the contract-lines-module "view" grant). Search, status/document status
 * filters and pagination all happen server-side, with the owning account
 * and project joined into every row; the response carries the page rows
 * plus the total count matching the filters. Cookies are forwarded
 * manually for the same SSR reason as the users feature (they are
 * httpOnly).
 */
const fetchContractLines = createServerFn({ method: 'GET' })
  .validator((input: ContractLinesQueryFilters) => input)
  .handler(async ({ data }): Promise<ContractLinesListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { contractLines: [], total: 0 }

    try {
      const response = await apiClient.get<{
        contractLines: Array<BackendContractLine>
        total: number
      }>('contract-lines', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          ...(data.documentStatus && data.documentStatus !== 'all'
            ? { documentStatus: toBackendDocumentStatus(data.documentStatus) }
            : undefined),
          ...(data.accountId ? { accountId: data.accountId } : undefined),
          ...(data.projectId ? { projectId: data.projectId } : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        contractLines: response.data.contractLines.map(toContractLineRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw contractLineError(err, 'Failed to load contract lines')
    }
  })

/** Base key shared by every contract line query (list, detail). */
export const contractLinesQueryKey = ['contract-lines'] as const

export const contractLinesListQueryKey = [
  ...contractLinesQueryKey,
  'list',
] as const

export const contractLinesListQueryOptions = ({
  search = '',
  status = 'all',
  documentStatus = 'all',
  accountId = '',
  projectId = '',
  page = 1,
  pageSize = 50,
}: ContractLinesQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...contractLinesListQueryKey,
      search.trim(),
      status,
      documentStatus,
      accountId,
      projectId,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchContractLines({
        data: {
          search,
          status,
          documentStatus,
          accountId,
          projectId,
          page,
          pageSize,
        },
      }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
