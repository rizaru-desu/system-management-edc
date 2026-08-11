import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateSerialError,
  terminalError,
  terminalsQueryKey,
  toBackendCondition,
  toBackendStatus,
  toTerminalRecord,
} from './list-terminals.ts'
import type { BackendTerminal } from './list-terminals.ts'
import type {
  TerminalCondition,
  TerminalRecord,
  TerminalStatus,
} from '../data/terminals.ts'

/** The form's payload in console shape ('' / null for blanks). */
export interface TerminalPayload {
  serialNumber: string
  productId: string
  /** null = in transit with no fixed warehouse. */
  warehouseId: string | null
  status: TerminalStatus
  condition: TerminalCondition
  merchantId: string | null
  entryDate: string
  notes: string
}

/** Console payload → the backend body (console values → uppercase enums). */
export function toBackendPayload(payload: TerminalPayload) {
  return {
    serialNumber: payload.serialNumber,
    productId: payload.productId,
    warehouseId: payload.warehouseId,
    status: toBackendStatus(payload.status),
    condition: toBackendCondition(payload.condition),
    merchantId: payload.merchantId,
    notes: payload.notes.trim() ? payload.notes.trim() : null,
    enteredSystemAt: payload.entryDate,
  }
}

/**
 * Creates a terminal through POST /terminals (gated by the terminals-module
 * "create" grant). Serial uniqueness and every reference are validated
 * server-side, and the registration entry lands in the status history
 * inside the same transaction.
 */
const createTerminalFn = createServerFn({ method: 'POST' })
  .validator((input: TerminalPayload) => input)
  .handler(async ({ data }): Promise<TerminalRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendTerminal>(
        'terminals',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toTerminalRecord(response.data)
    } catch (err: unknown) {
      throw terminalError(err, 'Failed to create the terminal')
    }
  })

/** Mutation for the create form; the list refetches on settle. */
export function useCreateTerminal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TerminalPayload) => createTerminalFn({ data: input }),
    onSuccess: (terminal) => {
      toast.success(`Terminal “${terminal.serialNumber}” created.`)
    },
    onError: (error) => {
      if (isDuplicateSerialError(error)) {
        toast.error('A terminal with this serial number already exists.')
        return
      }
      // Reference violations (unknown product/warehouse/merchant, merchant
      // outside Installed) surface the backend's message verbatim.
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the terminal.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: terminalsQueryKey }),
  })
}
