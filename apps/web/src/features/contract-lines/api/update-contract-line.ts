import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-contract-line.ts'
import type { ContractLinePayload } from './create-contract-line.ts'
import {
  contractLineError,
  contractLinesQueryKey,
  isDuplicateLineNumberError,
  toBackendStatus,
  toContractLineRecord,
} from './list-contract-lines.ts'
import type { BackendContractLine } from './list-contract-lines.ts'
import type {
  ContractLineRecord,
  ContractLineStatus,
} from '../data/contract-lines.ts'

/**
 * Updates a contract line through PATCH /contract-lines/:id (gated by the
 * contract-lines-module "update" grant). Line-number uniqueness and
 * account/project existence are re-validated server-side.
 */
const updateContractLineFn = createServerFn({ method: 'POST' })
  .validator((input: ContractLinePayload & { id: string }) => input)
  .handler(async ({ data }): Promise<ContractLineRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendContractLine>(
        `contract-lines/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toContractLineRecord(response.data)
    } catch (err: unknown) {
      throw contractLineError(err, 'Failed to update the contract line')
    }
  })

/** Mutation for the edit form; the list refetches on settle. */
export function useUpdateContractLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContractLinePayload & { id: string }) =>
      updateContractLineFn({ data: input }),
    onSuccess: (contractLine) => {
      toast.success(`Contract line “${contractLine.name}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateLineNumberError(error)) {
        toast.error('Line number is already in use.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the contract line.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: contractLinesQueryKey }),
  })
}

/**
 * Status-only PATCH for the table's Activate/Deactivate action — same
 * endpoint as the edit form, but a dedicated server fn so the request body
 * carries nothing except the status flip.
 */
const setContractLineStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; status: ContractLineStatus }) => input)
  .handler(async ({ data }): Promise<ContractLineRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendContractLine>(
        `contract-lines/${encodeURIComponent(data.id)}`,
        { status: toBackendStatus(data.status) },
        { headers: { cookie } },
      )
      return toContractLineRecord(response.data)
    } catch (err: unknown) {
      throw contractLineError(err, 'Failed to change the contract line status')
    }
  })

/** Mutation for the Activate/Deactivate dialog; the list refetches on settle. */
export function useSetContractLineStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: ContractLineStatus }) =>
      setContractLineStatusFn({ data: input }),
    onSuccess: (contractLine) => {
      toast.success(
        contractLine.status === 'active'
          ? `Contract line “${contractLine.name}” activated.`
          : `Contract line “${contractLine.name}” deactivated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the contract line status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: contractLinesQueryKey }),
  })
}
