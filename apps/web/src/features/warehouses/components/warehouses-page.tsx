import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ListTree, ListX, PackagePlus } from 'lucide-react'
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
import { useCreateWarehouse } from '../api/create-warehouse.ts'
import { useDeleteWarehouse } from '../api/delete-warehouse.ts'
import {
  useToggleWarehouseStatus,
  useUpdateWarehouse,
} from '../api/update-warehouse.ts'
import {
  isDuplicateCodeError,
  warehouseTreeQueryOptions,
} from '../api/warehouse-tree.ts'
import { WAREHOUSE_TYPES, WAREHOUSE_TYPE_LABELS } from '../data/warehouses.ts'
import type { WarehouseRecord, WarehouseType } from '../data/warehouses.ts'
import {
  buildWarehouseTree,
  collectParentIds,
  filterWarehouseTree,
  flattenVisibleRows,
} from '../lib/tree.ts'
import { DeleteWarehouseDialog } from './delete-warehouse-dialog.tsx'
import { WarehouseFormModal } from './warehouse-form-modal.tsx'
import type { WarehouseFormValues } from './warehouse-form-modal.tsx'
import { WarehousesTable } from './warehouses-table.tsx'

/**
 * Inventory → Warehouses: the Central → Regional → Service Point warehouse
 * hierarchy that Terminals, Inbound Shipments and the stock modules will
 * reference. The hierarchy comes from GET /warehouses/tree (flattened back
 * to `parentId` records — search, type/region filters, expand/collapse and
 * pagination all stay client-side over the full tree so matches keep their
 * ancestor context), and every CRUD action goes through the backend API;
 * the mutation hooks own toasts and cache invalidation.
 */
export function WarehousesPage() {
  const navigate = useNavigate()
  const treeQuery = useQuery(warehouseTreeQueryOptions())
  const records = useMemo(() => treeQuery.data ?? [], [treeQuery.data])
  const isPending = treeQuery.isPending

  // Start fully expanded so the hierarchy is visible at first glance —
  // once, when the tree first arrives; later refetches keep the user's
  // expand/collapse state.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const expandedInitialized = useRef(false)
  useEffect(() => {
    if (!expandedInitialized.current && records.length > 0) {
      expandedInitialized.current = true
      setExpandedIds(collectParentIds(records))
    }
  }, [records])

  // ── Search & filters ───────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | WarehouseType>('all')
  const [regionFilter, setRegionFilter] = useState('all')
  // Debounced copy of `search` so the tree isn't re-pruned per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const regionOptions = useMemo(
    () => [...new Set(records.map((record) => record.region))].sort(),
    [records],
  )

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    typeFilter !== 'all' ||
    regionFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setTypeFilter('all')
    setRegionFilter('all')
  }

  // ── Tree derivation ────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    const roots = buildWarehouseTree(records)
    const term = debouncedSearch.trim().toLowerCase()
    const filtered = isFiltering
      ? filterWarehouseTree(roots, (record) => {
          const matchesTerm =
            term === '' ||
            record.name.toLowerCase().includes(term) ||
            record.code.toLowerCase().includes(term)
          const matchesType = typeFilter === 'all' || record.type === typeFilter
          const matchesRegion =
            regionFilter === 'all' || record.region === regionFilter
          return matchesTerm && matchesType && matchesRegion
        })
      : roots
    // While filtering the tree renders fully expanded, so a match can never
    // sit hidden inside a collapsed branch.
    return flattenVisibleRows(filtered, isFiltering ? 'all' : expandedIds)
  }, [
    records,
    debouncedSearch,
    typeFilter,
    regionFilter,
    isFiltering,
    expandedIds,
  ])

  // ── Pagination (client-side over the visible flattened rows) ───────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term or a filter changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, typeFilter, regionFilter])

  // Collapsing branches (or deleting rows) can shrink the row set below the
  // current page — clamp to the last page that still exists.
  useEffect(() => {
    setPagination((previous) => {
      const lastPage = Math.max(
        0,
        Math.ceil(visibleRows.length / previous.pageSize) - 1,
      )
      return previous.pageIndex > lastPage
        ? { ...previous, pageIndex: lastPage }
        : previous
    })
  }, [visibleRows.length])

  const pageRows = useMemo(
    () =>
      visibleRows.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize,
      ),
    [visibleRows, pagination],
  )

  // ── Expand / collapse ──────────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => setExpandedIds(collectParentIds(records))
  const collapseAll = () => setExpandedIds(new Set())

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WarehouseRecord | null>(null)
  // Bumped on every duplicate-code 409 so the form modal highlights the
  // code field without losing the entered values.
  const [duplicateCodeConflict, setDuplicateCodeConflict] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<WarehouseRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDuplicateCodeConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: WarehouseRecord) => {
    setEditing(record)
    setDuplicateCodeConflict(0)
    setFormOpen(true)
  }

  const openDelete = (record: WarehouseRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const openDetail = (record: WarehouseRecord) => {
    void navigate({
      to: '/warehouses/$warehouseId',
      params: { warehouseId: record.id },
    })
  }

  const editingHasChildren = useMemo(
    () =>
      editing !== null &&
      records.some((record) => record.parentId === editing.id),
    [records, editing],
  )

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()
  const deleteWarehouse = useDeleteWarehouse()
  const toggleStatus = useToggleWarehouseStatus()

  const saving = createWarehouse.isPending || updateWarehouse.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload — duplicate code, parent-ladder violation, cycle —
  // keeps the user's input intact; the backend message shows as a toast and
  // a duplicate-code 409 additionally highlights the code field inline.
  const handleSubmit = (values: WarehouseFormValues) => {
    // The form validated type/parent presence before submitting.
    const payload = {
      name: values.name,
      code: values.code,
      type: values.type as WarehouseType,
      parentId: values.parentId,
      region: values.region,
      address: values.address,
      picName: values.picName,
      picContact: values.picContact,
      capacity: values.capacity,
      status: values.status,
    }
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateCodeError(error)) {
          setDuplicateCodeConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateWarehouse.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createWarehouse.mutate(payload, callbacks)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteWarehouse.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
  }

  const handleToggleStatus = (record: WarehouseRecord) => {
    toggleStatus.mutate({ id: record.id })
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Inventory
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Warehouses
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the warehouse hierarchy — Central, Regional and Service Point
            warehouses under one tree.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
          Add warehouse
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or code…"
          containerClassName="min-w-[240px] sm:max-w-xs"
          isFetching={treeQuery.isFetching && !treeQuery.isPending}
        />
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(value as 'all' | WarehouseType)
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {WAREHOUSE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {WAREHOUSE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Filter by region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regionOptions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            disabled={isPending || isFiltering}
            onClick={expandAll}
          >
            <ListTree className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Expand tree
          </Button>
          <Button
            variant="outline"
            disabled={isPending || isFiltering}
            onClick={collapseAll}
          >
            <ListX className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Collapse tree
          </Button>
        </div>
      </div>

      {/* Tree table */}
      <WarehousesTable
        rows={pageRows}
        total={visibleRows.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={isPending}
        isError={treeQuery.isError}
        errorMessage={
          treeQuery.error instanceof Error
            ? treeQuery.error.message
            : 'Failed to load warehouses.'
        }
        onRetry={() => treeQuery.refetch()}
        isFiltering={isFiltering}
        onToggleExpand={toggleExpand}
        onClearFilters={clearFilters}
        onView={openDetail}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={openDelete}
      />

      <WarehouseFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouse={editing}
        hasChildren={editingHasChildren}
        saving={saving}
        duplicateCodeConflict={duplicateCodeConflict}
        onSubmit={handleSubmit}
      />
      <DeleteWarehouseDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        warehouse={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
