import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListTree, ListX, MapPinPlus } from 'lucide-react'
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
import { useCreateServicePoint } from '../api/create-service-point.ts'
import type { ServicePointPayload } from '../api/create-service-point.ts'
import { useDeleteServicePoint } from '../api/delete-service-point.ts'
import { servicePointDetailQueryOptions } from '../api/service-point-detail.ts'
import { servicePointTreeQueryOptions } from '../api/service-point-tree.ts'
import { useUpdateServicePoint } from '../api/update-service-point.ts'
import type {
  ServicePointRecord,
  ServicePointStatus,
} from '../data/service-points.ts'
import {
  buildParentOptions,
  buildServicePointTree,
  collectDescendantIds,
  collectParentIds,
  filterServicePointTree,
  flattenVisibleRows,
} from '../lib/tree.ts'
import { DeleteServicePointDialog } from './delete-service-point-dialog.tsx'
import { ServicePointFormModal } from './service-point-form-modal.tsx'
import type { ServicePointFormValues } from './service-point-form-modal.tsx'
import { ServicePointViewModal } from './service-point-view-modal.tsx'
import { ServicePointsTable } from './service-points-table.tsx'

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto the API payload shape. */
function payloadFromForm(values: ServicePointFormValues): ServicePointPayload {
  return {
    code: values.code,
    name: values.name,
    parentId: values.parentId,
    region: blankOrNull(values.region),
    address: blankOrNull(values.address),
    phone: blankOrNull(values.phone),
    email: blankOrNull(values.email),
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    coverageRadiusKm: values.coverageRadiusKm.trim()
      ? Number(values.coverageRadiusKm)
      : null,
    status: values.status,
    notes: blankOrNull(values.notes),
  }
}

/**
 * Administration → Service Point. The hierarchy comes from GET
 * /service-points/tree (flattened back to `parentId` records — search,
 * status filter, expand/collapse and pagination all stay client-side over
 * the full tree), and every CRUD action goes through the backend API.
 * Leader/PIC are deliberately absent — they belong to the Service Point
 * Assignment module.
 */
export function ServicePointsPage() {
  const treeQuery = useQuery(servicePointTreeQueryOptions())
  const records = useMemo(() => treeQuery.data ?? [], [treeQuery.data])
  const isPending = treeQuery.isPending

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Start fully expanded so the hierarchy is visible at first glance —
  // once, when the tree first arrives; later refetches keep the user's
  // expand/collapse state.
  const expandedInitialized = useRef(false)
  useEffect(() => {
    if (!expandedInitialized.current && records.length > 0) {
      expandedInitialized.current = true
      setExpandedIds(collectParentIds(records))
    }
  }, [records])

  // ── Search & filter ────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ServicePointStatus>(
    'all',
  )
  // Debounced copy of `search` so the tree isn't re-pruned per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering = debouncedSearch.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
  }

  // ── Tree derivation ────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    const roots = buildServicePointTree(records)
    const term = debouncedSearch.trim().toLowerCase()
    const filtered = isFiltering
      ? filterServicePointTree(roots, (record) => {
          const matchesTerm =
            term === '' ||
            record.name.toLowerCase().includes(term) ||
            record.code.toLowerCase().includes(term) ||
            (record.region ?? '').toLowerCase().includes(term)
          const matchesStatus =
            statusFilter === 'all' || record.status === statusFilter
          return matchesTerm && matchesStatus
        })
      : roots
    // While filtering the tree renders fully expanded, so a match can never
    // sit hidden inside a collapsed branch.
    return flattenVisibleRows(filtered, isFiltering ? 'all' : expandedIds)
  }, [records, debouncedSearch, statusFilter, isFiltering, expandedIds])

  // ── Pagination (client-side over the visible flattened rows) ───────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term or status filter changes the row set, so any
  // page beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, statusFilter])

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
  const [editing, setEditing] = useState<ServicePointRecord | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<ServicePointRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ServicePointRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: ServicePointRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openView = (record: ServicePointRecord) => {
    setViewing(record)
    setViewOpen(true)
  }

  const openDelete = (record: ServicePointRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const parentOptions = useMemo(
    () => buildParentOptions(records, editing?.id ?? null),
    [records, editing],
  )

  const recordsById = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records],
  )

  // Names from the root down to the viewed record, for the detail dialog.
  const viewingPath = useMemo(() => {
    if (!viewing) return []
    const path: Array<string> = []
    let current: ServicePointRecord | undefined = viewing
    while (current) {
      path.unshift(current.name)
      current = current.parentId ? recordsById.get(current.parentId) : undefined
    }
    return path
  }, [viewing, recordsById])

  const deletingDescendants = useMemo(
    () => (deleting ? collectDescendantIds(records, deleting.id).size : 0),
    [records, deleting],
  )

  // The view dialog re-reads the record so it always shows fresh data even
  // when the cached tree is stale (GET /service-points/:id).
  const detailQuery = useQuery({
    ...servicePointDetailQueryOptions(viewing?.id ?? ''),
    enabled: viewOpen && viewing !== null,
  })

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createServicePoint = useCreateServicePoint()
  const updateServicePoint = useUpdateServicePoint()
  const deleteServicePoint = useDeleteServicePoint()

  const handleSubmit = (values: ServicePointFormValues) => {
    const payload = payloadFromForm(values)
    if (editing) {
      updateServicePoint.mutate({ id: editing.id, ...payload })
      return
    }
    createServicePoint.mutate(payload, {
      // Reveal the new row immediately, wherever it landed in the tree.
      onSuccess: (created) => {
        if (created.parentId) {
          setExpandedIds(
            (previous) => new Set([...previous, created.parentId!]),
          )
        }
      },
    })
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteServicePoint.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
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
            Service Point
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the service point hierarchy — regions, branches and sub-areas
            under one tree.
          </p>
        </div>
        <Button onClick={openCreate}>
          <MapPinPlus className="h-4 w-4" strokeWidth={1.75} />
          Add service point
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, code or region…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | ServicePointStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
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
      <ServicePointsTable
        rows={pageRows}
        total={visibleRows.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={isPending}
        isError={treeQuery.isError}
        errorMessage={
          treeQuery.error instanceof Error
            ? treeQuery.error.message
            : 'Failed to load service points.'
        }
        onRetry={() => treeQuery.refetch()}
        isFiltering={isFiltering}
        onToggleExpand={toggleExpand}
        onClearFilters={clearFilters}
        onView={openView}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <ServicePointFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        servicePoint={editing}
        parentOptions={parentOptions}
        onSubmit={handleSubmit}
      />
      <ServicePointViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        servicePoint={
          detailQuery.data && detailQuery.data.id === viewing?.id
            ? detailQuery.data
            : viewing
        }
        parentName={
          viewing?.parentId
            ? (recordsById.get(viewing.parentId)?.name ?? null)
            : null
        }
        hierarchyPath={viewingPath}
      />
      <DeleteServicePointDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        servicePoint={deleting}
        descendantCount={deletingDescendants}
        onConfirm={handleDelete}
      />
    </div>
  )
}
