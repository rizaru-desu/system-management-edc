import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PackagePlus } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'

import { Button } from '#/components/ui/button.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { useCreateItemCategory } from '../api/create-item-category.ts'
import { useDeleteItemCategory } from '../api/delete-item-category.ts'
import {
  isDuplicateCodeError,
  isDuplicateNameError,
  itemCategoriesListQueryOptions,
} from '../api/list-item-categories.ts'
import {
  useToggleItemCategoryStatus,
  useUpdateItemCategory,
} from '../api/update-item-category.ts'
import { ACCESSORY_CATEGORIES } from '../data/item-categories.ts'
import type {
  AccessoryCategory,
  ItemCategoryRecord,
} from '../data/item-categories.ts'
import { DeleteItemCategoryDialog } from './delete-item-category-dialog.tsx'
import { ItemCategoryFormModal } from './item-category-form-modal.tsx'
import type { ItemCategoryFormValues } from './item-category-form-modal.tsx'
import { ItemCategoriesTable } from './item-categories-table.tsx'

/**
 * Administration → Item Categories: the master catalogue of completeness/
 * accessory items (chargers, cables, receipt rolls…) that Products will
 * reference as their standard box contents. Search, category filter and
 * pagination all run server-side (GET /item-categories), and every CRUD
 * action goes through the backend API; the mutation hooks own toasts and
 * cache invalidation, so the table refreshes after every write.
 */
export function ItemCategoriesPage() {
  // ── Search & filter (server-side) ──────────────────────────────────────
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | AccessoryCategory
  >('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering = debouncedSearch.trim() !== '' || categoryFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategoryFilter('all')
  }

  // ── Pagination (server-side) ───────────────────────────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term or category filter changes the row set, so any
  // page beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, categoryFilter])

  const listQuery = useQuery(
    itemCategoriesListQueryOptions({
      search: debouncedSearch,
      category: categoryFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const itemCategories = listQuery.data?.itemCategories ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ItemCategoryRecord | null>(null)
  // Bumped on every duplicate 409 so the form modal highlights the
  // conflicting field without losing the entered values.
  const [duplicateNameConflict, setDuplicateNameConflict] = useState(0)
  const [duplicateCodeConflict, setDuplicateCodeConflict] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ItemCategoryRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDuplicateNameConflict(0)
    setDuplicateCodeConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: ItemCategoryRecord) => {
    setEditing(record)
    setDuplicateNameConflict(0)
    setDuplicateCodeConflict(0)
    setFormOpen(true)
  }

  const openDelete = (record: ItemCategoryRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createItemCategory = useCreateItemCategory()
  const updateItemCategory = useUpdateItemCategory()
  const deleteItemCategory = useDeleteItemCategory()
  const toggleStatus = useToggleItemCategoryStatus()

  const saving = createItemCategory.isPending || updateItemCategory.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload keeps the user's input intact. A duplicate name/code
  // 409 additionally highlights the conflicting field inline.
  const handleSubmit = (values: ItemCategoryFormValues) => {
    // The form validated category/unit as non-empty before submitting.
    const payload = {
      name: values.name,
      code: values.code,
      category: values.category as AccessoryCategory,
      unit: values.unit as ItemCategoryRecord['unit'],
      description: values.description,
      status: values.status,
    }
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateNameError(error)) {
          setDuplicateNameConflict((previous) => previous + 1)
        } else if (isDuplicateCodeError(error)) {
          setDuplicateCodeConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateItemCategory.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createItemCategory.mutate(payload, callbacks)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteItemCategory.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
  }

  const handleToggleStatus = (record: ItemCategoryRecord) => {
    toggleStatus.mutate({ id: record.id })
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Administration
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Item Categories
          </h1>
          <p className="text-sm text-brand-900/60">
            Master catalogue of completeness and accessory items products
            reference as their standard box contents.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
          Add item
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by item name…"
          containerClassName="min-w-[240px] sm:max-w-xs"
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select
          value={categoryFilter}
          onValueChange={(value) =>
            setCategoryFilter(value as 'all' | AccessoryCategory)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ACCESSORY_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ItemCategoriesTable
        rows={itemCategories}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load item categories.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={openDelete}
      />

      <ItemCategoryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        saving={saving}
        duplicateNameConflict={duplicateNameConflict}
        duplicateCodeConflict={duplicateCodeConflict}
        onSubmit={handleSubmit}
      />
      <DeleteItemCategoryDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
