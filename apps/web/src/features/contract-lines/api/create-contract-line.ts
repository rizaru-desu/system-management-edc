import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { accountsQueryKey } from '#/features/accounts/index.ts'
import { projectsQueryKey } from '#/features/projects/index.ts'
import {
  contractLineError,
  contractLinesQueryKey,
  isDuplicateLineNumberError,
  toBackendDocumentStatus,
  toBackendStatus,
  toContractLineRecord,
} from './list-contract-lines.ts'
import type { BackendContractLine } from './list-contract-lines.ts'
import type {
  ContractLineRecord,
  ContractLineStatus,
  DocumentStatus,
} from '../data/contract-lines.ts'

/** The add/edit form's payload, in frontend field shapes. */
export interface ContractLinePayload {
  lineNumber: string
  name: string
  status: ContractLineStatus
  documentStatus: DocumentStatus
  vendorEdc: string | null
  accountId: string
  projectId: string
  serviceItem: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
}

/** Frontend payload → the backend DTO (column names + uppercase enums). */
export function toBackendPayload(payload: ContractLinePayload) {
  return {
    lineNumber: payload.lineNumber,
    lineName: payload.name,
    status: toBackendStatus(payload.status),
    documentStatus: toBackendDocumentStatus(payload.documentStatus),
    vendorEdc: payload.vendorEdc,
    accountId: payload.accountId,
    projectId: payload.projectId,
    serviceItem: payload.serviceItem,
    startDate: payload.startDate,
    endDate: payload.endDate,
    notes: payload.notes,
  }
}

/**
 * Creates a contract line through POST /contract-lines (gated by the
 * contract-lines-module "create" grant). Line-number uniqueness and
 * account/project existence are validated server-side; 409 = line number
 * already in use.
 */
const createContractLineFn = createServerFn({ method: 'POST' })
  .validator((input: ContractLinePayload) => input)
  .handler(async ({ data }): Promise<ContractLineRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendContractLine>(
        'contract-lines',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toContractLineRecord(response.data)
    } catch (err: unknown) {
      throw contractLineError(err, 'Failed to create the contract line')
    }
  })

/**
 * Mutation for the add form. Creation is pessimistic (the server mints the
 * id), so the list refetches on settle; success and failure both surface as
 * toasts. A duplicate-number 409 additionally gets an inline highlight via
 * the form's conflict counter (see the page).
 */
export function useCreateContractLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContractLinePayload) =>
      createContractLineFn({ data: input }),
    onSuccess: (contractLine) => {
      toast.success(`Contract line “${contractLine.name}” created.`)
    },
    onError: (error) => {
      if (isDuplicateLineNumberError(error)) {
        toast.error('Line number is already in use.')
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the contract line.',
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: contractLinesQueryKey })
      // Contract line writes change the aggregated counts shown on the
      // accounts and projects lists — refresh them too.
      void queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}
