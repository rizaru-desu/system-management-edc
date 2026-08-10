import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-warehouse.ts'
import type { WarehousePayload } from './create-warehouse.ts'
import {
  isDuplicateCodeError,
  toWarehouseRecord,
  warehouseError,
  warehousesQueryKey,
} from './warehouse-tree.ts'
import type { BackendWarehouse } from './warehouse-tree.ts'
import type { WarehouseRecord } from '../data/warehouses.ts'

/**
 * Updates a warehouse through PATCH /warehouses/:id (gated by the
 * warehouses-module "update" grant). Code uniqueness, the type ↔ parent
 * ladder, cycle prevention and the children type-lock are re-validated
 * server-side.
 */
const updateWarehouseFn = createServerFn({ method: 'POST' })
  .validator((input: WarehousePayload & { id: string }) => input)
  .handler(async ({ data }): Promise<WarehouseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendWarehouse>(
        `warehouses/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toWarehouseRecord(response.data)
    } catch (err: unknown) {
      throw warehouseError(err, 'Failed to update the warehouse')
    }
  })

/** Mutation for the edit form; the tree refetches on settle. */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WarehousePayload & { id: string }) =>
      updateWarehouseFn({ data: input }),
    onSuccess: (warehouse) => {
      toast.success(`Warehouse “${warehouse.name}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateCodeError(error)) {
        toast.error('A warehouse with this code already exists.')
        return
      }
      // Hierarchy-rule violations (parent ladder, cycles, type lock)
      // surface the backend's message verbatim.
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the warehouse.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  })
}

/**
 * Body-less status flip through PATCH /warehouses/:id/toggle-status — the
 * table's quick toggle. Deactivating a parent with active children is
 * refused server-side; the 409 message surfaces as-is.
 */
const toggleWarehouseStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<WarehouseRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendWarehouse>(
        `warehouses/${encodeURIComponent(data.id)}/toggle-status`,
        undefined,
        { headers: { cookie } },
      )
      return toWarehouseRecord(response.data)
    } catch (err: unknown) {
      throw warehouseError(err, 'Failed to change the warehouse status')
    }
  })

/** Mutation for the table's status switch; the tree refetches on settle. */
export function useToggleWarehouseStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      toggleWarehouseStatusFn({ data: input }),
    onSuccess: (warehouse) => {
      toast.success(
        warehouse.status === 'active'
          ? `Warehouse “${warehouse.name}” activated.`
          : `Warehouse “${warehouse.name}” deactivated.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the warehouse status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  })
}
