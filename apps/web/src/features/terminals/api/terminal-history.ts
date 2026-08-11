import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { apiClient } from '#/lib/api-client.ts'
import { terminalError, terminalsQueryKey } from './list-terminals.ts'
import { toTerminalHistoryRecord } from './terminal-detail.ts'
import type { BackendTerminalHistoryEntry } from './terminal-detail.ts'
import type { TerminalHistoryRecord } from '../data/terminals.ts'

/**
 * Fetches the movement history of one terminal from the dedicated GET
 * /terminals/:id/history endpoint (newest first) — lazy-loaded by the
 * detail page's Movement History section with its own loading/error
 * states.
 */
const fetchTerminalHistory = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<Array<TerminalHistoryRecord>> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return []

    try {
      const response = await apiClient.get<Array<BackendTerminalHistoryEntry>>(
        `terminals/${encodeURIComponent(data.id)}/history`,
        { headers: { cookie } },
      )
      return response.data.map(toTerminalHistoryRecord)
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to load the movement history')
    }
  })

export const terminalHistoryQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...terminalsQueryKey, 'history', id],
    queryFn: () => fetchTerminalHistory({ data: { id } }),
    staleTime: 30_000,
  })
