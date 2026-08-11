import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-terminal.ts'
import type { TerminalPayload } from './create-terminal.ts'
import {
  isDuplicateSerialError,
  terminalError,
  terminalsQueryKey,
  toTerminalRecord,
} from './list-terminals.ts'
import type { BackendTerminal } from './list-terminals.ts'
import type { TerminalRecord } from '../data/terminals.ts'

/**
 * Updates a terminal through PATCH /terminals/:id (gated by the
 * terminals-module "update" grant). A status or warehouse change writes a
 * movement-history row inside the backend's transaction; serial uniqueness
 * and every reference are re-validated server-side.
 */
const updateTerminalFn = createServerFn({ method: 'POST' })
  .validator((input: TerminalPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<TerminalRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendTerminal>(
        `terminals/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toTerminalRecord(response.data)
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to update the terminal')
    }
  })

/**
 * Mutation for the edit form; list, detail and history all refetch on
 * settle (one shared base key), so a logged transition shows up in the
 * Movement History section immediately.
 */
export function useUpdateTerminal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TerminalPayload & { id: string }) =>
      updateTerminalFn({ data: input }),
    onSuccess: (terminal) => {
      toast.success(`Terminal “${terminal.serialNumber}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateSerialError(error)) {
        toast.error('A terminal with this serial number already exists.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the terminal.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: terminalsQueryKey }),
  })
}
