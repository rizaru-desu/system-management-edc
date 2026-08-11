import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import {
  terminalError,
  terminalsQueryKey,
  toTerminalRecord,
} from './list-terminals.ts'
import type {
  BackendTerminal,
  BackendTerminalStatus,
} from './list-terminals.ts'
import type {
  TerminalHistoryRecord,
  TerminalRecord,
  TerminalStatus,
} from '../data/terminals.ts'

/** One history entry as served by the backend (display fields joined). */
export interface BackendTerminalHistoryEntry {
  id: string
  fromStatus: BackendTerminalStatus | null
  toStatus: BackendTerminalStatus
  fromWarehouseId: string | null
  fromWarehouseName: string | null
  toWarehouseId: string | null
  toWarehouseName: string | null
  changedByName: string | null
  notes: string | null
  changedAt: string
}

const STATUS_RECORDS: Record<BackendTerminalStatus, TerminalStatus> = {
  IN_STOCK: 'in-stock',
  IN_TRANSIT: 'in-transit',
  INSTALLED: 'installed',
  UNDER_MAINTENANCE: 'under-maintenance',
  DAMAGED: 'damaged',
  RETIRED: 'retired',
}

export function toTerminalHistoryRecord(
  row: BackendTerminalHistoryEntry,
): TerminalHistoryRecord {
  return {
    id: row.id,
    fromStatus: row.fromStatus ? STATUS_RECORDS[row.fromStatus] : null,
    toStatus: STATUS_RECORDS[row.toStatus],
    fromWarehouseName: row.fromWarehouseName,
    toWarehouseName: row.toWarehouseName,
    changedByName: row.changedByName,
    notes: row.notes ?? '',
    changedAt: new Date(row.changedAt)
      .toISOString()
      .slice(0, 16)
      .replace('T', ' '),
  }
}

/**
 * Fetches one terminal from GET /terminals/:id. A 404 resolves to null so
 * the page can render its not-found state instead of the error card. The
 * movement history rides the same payload server-side but the detail
 * section lazy-loads it through GET /terminals/:id/history (see
 * `terminal-history.ts`), so this fn maps the record only.
 */
const fetchTerminalDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<TerminalRecord | null> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    try {
      const response = await apiClient.get<BackendTerminal>(
        `terminals/${encodeURIComponent(data.id)}`,
        { headers: { cookie } },
      )
      return toTerminalRecord(response.data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null
      throw terminalError(err, 'Failed to load the terminal')
    }
  })

export const terminalDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...terminalsQueryKey, 'detail', id],
    queryFn: () => fetchTerminalDetail({ data: { id } }),
    staleTime: 30_000,
  })
