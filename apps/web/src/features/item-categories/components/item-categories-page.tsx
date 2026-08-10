import { useEffect, useMemo, useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  ACCESSORY_CATEGORIES,
  SEED_ITEM_CATEGORIES,
} from '../data/item-categories.ts'
import type {
  AccessoryCategory,
  ItemCategoryRecord,
} from '../data/item-categories.ts'
import { ItemCategoryFormModal } from './item-category-form-modal.tsx'
import type { ItemCategoryFormValues } from './item-category-form-modal.tsx'
import { ItemCategoriesTable } from './item-categories-table.tsx'

/**
 * Administration → Item Categories: the master catalogue of completeness/
 * accessory items (chargers, cables, receipt rolls…) that Products will
 * reference as their standard box contents. UI-only for now — the list lives
 * in local state seeded from mock data; search, category filter, pagination
 * and the quick status toggle all run client-side until a backend exists.
 */
export function ItemCategoriesPage() {
  const [records, setRecords] =
    useState<Array<ItemCategoryRecord>>(SEED_ITEM_CATEGORIES)

  // ── Search & filter ────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | AccessoryCategory
  >('all')
  // Debounced copy of `search` so the list isn't re-filtered per keystroke.
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

  const filteredRecords = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return records.filter((record) => {
      const matchesTerm =
        term === '' || record.name.toLowerCase().includes(term)
      const matchesCategory =
        categoryFilter === 'all' || record.category === categoryFilter
      return matchesTerm && matchesCategory
    })
  }, [records, debouncedSearch, categoryFilter])

  // ── Pagination (client-side over the filtered list) ────────────────────
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

  const pageRows = useMemo(
    () =>
      filteredRecords.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize,
      ),
    [filteredRecords, pagination],
  )

  // ── Modal ──────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ItemCategoryRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: ItemCategoryRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  /** Case-insensitive duplicate check, ignoring the record being edited. */
  const isNameTaken = (name: string) => {
    const candidate = name.trim().toLowerCase()
    return records.some(
      (record) =>
        record.id !== editing?.id &&
        record.name.trim().toLowerCase() === candidate,
    )
  }

  // ── Mock CRUD (local state only until the backend exists) ──────────────
  const handleSubmit = (values: ItemCategoryFormValues) => {
    // The form validated category/unit as non-empty before submitting.
    const shared = {
      name: values.name,
      code: values.code,
      category: values.category as AccessoryCategory,
      unit: values.unit as ItemCategoryRecord['unit'],
      description: values.description,
      status: values.status,
    }
    if (editing) {
      setRecords((previous) =>
        previous.map((record) =>
          record.id === editing.id ? { ...record, ...shared } : record,
        ),
      )
      toast.success(`Item “${values.name}” updated.`)
      return
    }
    setRecords((previous) => [
      ...previous,
      {
        ...shared,
        id: crypto.randomUUID(),
        productUsageCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ])
    toast.success(`Item “${values.name}” created.`)
  }

  const handleToggleStatus = (record: ItemCategoryRecord) => {
    const nextStatus = record.status === 'active' ? 'inactive' : 'active'
    setRecords((previous) =>
      previous.map((entry) =>
        entry.id === record.id ? { ...entry, status: nextStatus } : entry,
      ),
    )
    toast.success(
      nextStatus === 'active'
        ? `Item “${record.name}” activated.`
        : `Item “${record.name}” deactivated.`,
    )
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
        rows={pageRows}
        total={filteredRecords.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
      />

      <ItemCategoryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        isNameTaken={isNameTaken}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
