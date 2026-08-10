import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateCodeError,
  toBackendStatus,
  toBackendType,
  toWarehouseRecord,
  warehouseError,
  warehousesQueryKey,
} from './warehouse-tree.ts'
import type { BackendWarehouse } from './warehouse-tree.ts'
import type {
  WarehouseRecord,
  WarehouseStatus,
  WarehouseType,
} from '../data/warehouses.ts'

/** The form's payload in console shape ('' for blanks). */
export interface WarehousePayload {
  name: string
  code: string
  type: WarehouseType
  parentId: string | null
  region: string
  address: string
  picName: string
  picContact: string
  /** Capacity in units as entered; '' = not set. */
  capacity: string
  status: WarehouseStatus
}

/** Console payload → the backend body (console values → uppercase enums). */
export function toBackendPayload(payload: WarehousePayload) {
  return {
    name: payload.name,
    code: payload.code,
    type: toBackendType(payload.type),
    parentId: payload.parentId,
    region: payload.region,
    address: payload.address,
    picName: payload.picName,
    picContact: payload.picContact.trim() ? payload.picContact.trim() : null,
    capacity: payload.capacity.trim() ? Number(payload.capacity) : null,
    status: toBackendStatus(payload.status),
  }
}

/**
 * Creates a warehouse through POST /warehouses (gated by the
 * warehouses-module "create" grant). Code uniqueness and the type ↔ parent
 * ladder are re-validated server-side.
 */
const createWarehouseFn = createServerFn({ method: 'POST' })
  .validator((input: WarehousePayload) => input)
  .handler(async ({ data }): Promise<WarehouseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendWarehouse>(
        'warehouses',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toWarehouseRecord(response.data)
    } catch (err: unknown) {
      throw warehouseError(err, 'Failed to create the warehouse')
    }
  })

/** Mutation for the create form; the tree refetches on settle. */
export function useCreateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WarehousePayload) => createWarehouseFn({ data: input }),
    onSuccess: (warehouse) => {
      toast.success(`Warehouse “${warehouse.name}” created.`)
    },
    onError: (error) => {
      if (isDuplicateCodeError(error)) {
        toast.error('A warehouse with this code already exists.')
        return
      }
      // Hierarchy-rule violations (parent ladder, cycles) surface the
      // backend's message verbatim.
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create the warehouse.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  })
}
