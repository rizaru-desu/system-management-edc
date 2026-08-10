import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import {
  isDuplicateCodeError,
  isDuplicateNameError,
  itemCategoriesQueryKey,
  itemCategoryError,
  toBackendCategory,
  toBackendStatus,
  toBackendUnit,
  toItemCategoryRecord,
} from './list-item-categories.ts'
import type { BackendItemCategory } from './list-item-categories.ts'
import type {
  AccessoryCategory,
  ItemCategoryRecord,
  ItemCategoryStatus,
  ItemUnit,
} from '../data/item-categories.ts'

/** The form's payload in console shape (display labels, '' for blanks). */
export interface ItemCategoryPayload {
  name: string
  code: string
  category: AccessoryCategory
  unit: ItemUnit
  description: string
  status: ItemCategoryStatus
}

/** Console payload → the backend body (labels → uppercase enums, '' → null). */
export function toBackendPayload(payload: ItemCategoryPayload) {
  return {
    name: payload.name,
    code: payload.code.trim() ? payload.code.trim() : null,
    accessoryCategory: toBackendCategory(payload.category),
    unit: toBackendUnit(payload.unit),
    description: payload.description.trim() ? payload.description.trim() : null,
    status: toBackendStatus(payload.status),
  }
}

/**
 * Creates an item category through POST /item-categories (gated by the
 * item-categories-module "create" grant). Name/code uniqueness is validated
 * server-side.
 */
const createItemCategoryFn = createServerFn({ method: 'POST' })
  .validator((input: ItemCategoryPayload) => input)
  .handler(async ({ data }): Promise<ItemCategoryRecord> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<BackendItemCategory>(
        'item-categories',
        toBackendPayload(data),
        { headers: { cookie } },
      )
      return toItemCategoryRecord(response.data)
    } catch (err: unknown) {
      throw itemCategoryError(err, 'Failed to create the item')
    }
  })

/** Mutation for the create form; the list refetches on settle. */
export function useCreateItemCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ItemCategoryPayload) =>
      createItemCategoryFn({ data: input }),
    onSuccess: (itemCategory) => {
      toast.success(`Item “${itemCategory.name}” created.`)
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
        error instanceof Error ? error.message : 'Failed to create the item.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: itemCategoriesQueryKey }),
  })
}
