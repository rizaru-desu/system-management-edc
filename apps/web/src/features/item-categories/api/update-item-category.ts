import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { toBackendPayload } from './create-item-category.ts'
import type { ItemCategoryPayload } from './create-item-category.ts'
import {
  isDuplicateCodeError,
  isDuplicateNameError,
  itemCategoriesQueryKey,
  itemCategoryError,
  toItemCategoryRecord,
} from './list-item-categories.ts'
import type { BackendItemCategory } from './list-item-categories.ts'
import type { ItemCategoryRecord } from '../data/item-categories.ts'

/**
 * Updates an item category through PATCH /item-categories/:id (gated by the
 * item-categories-module "update" grant). Name/code uniqueness is
 * re-validated server-side.
 */
const updateItemCategoryFn = createServerFn({ method: 'POST' })
  .validator((input: ItemCategoryPayload & { id: string }) => input)
  .handler(async ({ data }): Promise<ItemCategoryRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    const { id, ...payload } = data
    try {
      const response = await apiClient.patch<BackendItemCategory>(
        `item-categories/${encodeURIComponent(id)}`,
        toBackendPayload(payload),
        { headers: { cookie } },
      )
      return toItemCategoryRecord(response.data)
    } catch (err: unknown) {
      throw itemCategoryError(err, 'Failed to update the item')
    }
  })

/** Mutation for the edit form; the list refetches on settle. */
export function useUpdateItemCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ItemCategoryPayload & { id: string }) =>
      updateItemCategoryFn({ data: input }),
    onSuccess: (itemCategory) => {
      toast.success(`Item “${itemCategory.name}” updated.`)
    },
    onError: (error) => {
      if (isDuplicateNameError(error)) {
        toast.error('An item with this name already exists.')
        return
      }
      if (isDuplicateCodeError(error)) {
        toast.error('An item with this code already exists.')
        return
      }
      toast.error(
        error instanceof Error ? error.message : 'Failed to update the item.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: itemCategoriesQueryKey }),
  })
}

/**
 * Body-less status flip through PATCH /item-categories/:id/toggle-status —
 * the table's quick toggle, kept off the edit form's payload entirely.
 */
const toggleItemCategoryStatusFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ItemCategoryRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.patch<BackendItemCategory>(
        `item-categories/${encodeURIComponent(data.id)}/toggle-status`,
        undefined,
        { headers: { cookie } },
      )
      return toItemCategoryRecord(response.data)
    } catch (err: unknown) {
      throw itemCategoryError(err, 'Failed to change the item status')
    }
  })

/**
 * Mutation for the table's status switch, with an optimistic cache flip so
 * the switch responds instantly; a failure rolls the cache back and the
 * settle-refetch reconciles either way.
 */
export function useToggleItemCategoryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) =>
      toggleItemCategoryStatusFn({ data: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: itemCategoriesQueryKey })
      const snapshots = queryClient.getQueriesData<{
        itemCategories: Array<ItemCategoryRecord>
        total: number
      }>({ queryKey: itemCategoriesQueryKey })
      queryClient.setQueriesData<{
        itemCategories: Array<ItemCategoryRecord>
        total: number
      }>({ queryKey: itemCategoriesQueryKey }, (page) =>
        page
          ? {
              ...page,
              itemCategories: page.itemCategories.map((record) =>
                record.id === input.id
                  ? {
                      ...record,
                      status:
                        record.status === 'active' ? 'inactive' : 'active',
                    }
                  : record,
              ),
            }
          : page,
      )
      return { snapshots }
    },
    onSuccess: (itemCategory) => {
      toast.success(
        itemCategory.status === 'active'
          ? `Item “${itemCategory.name}” activated.`
          : `Item “${itemCategory.name}” deactivated.`,
      )
    },
    onError: (error, _input, context) => {
      for (const [queryKey, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, snapshot)
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to change the item status.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: itemCategoriesQueryKey }),
  })
}
