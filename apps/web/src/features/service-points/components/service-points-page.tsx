import { useEffect, useMemo, useState } from 'react'
import { ListTree, ListX, MapPinPlus, RefreshCw } from 'lucide-react'
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
import { cn } from '#/lib/utils.ts'
import { SEED_SERVICE_POINTS } from '../data/service-points.ts'
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

/** Simulated fetch latency so the loading/refresh states are visible. */
const MOCK_LOAD_MS = 600
const MOCK_REFRESH_MS = 500

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto a stored record (mock persistence). */
function recordFromForm(
  values: ServicePointFormValues,
  base: Pick<ServicePointRecord, 'id' | 'assignedUsers' | 'createdAt'>,
): ServicePointRecord {
  return {
    ...base,
    code: values.code,
    name: values.name,
    parentId: values.parentId,
    region: blankOrNull(values.region),
    address: blankOrNull(values.address),
    phone: blankOrNull(values.phone),
    email: blankOrNull(values.email),
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    status: values.status,
    notes: blankOrNull(values.notes),
  }
}

/**
 * Administration → Service Point. UI-only for now: the hierarchy lives in
 * local state seeded from mock data (loading and refresh are simulated), and
 * every CRUD action mutates that state without any backend call. Leader/PIC
 * are deliberately absent — they arrive with the Service Point Assignment
 * module later.
 */
export function ServicePointsPage() {
  // ── Mock data lifecycle ────────────────────────────────────────────────
  const [records, setRecords] = useState<Array<ServicePointRecord>>([])
  const [isPending, setIsPending] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecords(SEED_SERVICE_POINTS)
      // Start fully expanded so the hierarchy is visible at first glance.
      setExpandedIds(collectParentIds(SEED_SERVICE_POINTS))
      setIsPending(false)
    }, MOCK_LOAD_MS)
    return () => clearTimeout(timer)
  }, [])

  const refresh = () => {
    if (isPending || isFetching) return
    setIsFetching(true)
    // A real refetch would reload from the backend; the mock just spins and
    // keeps the in-memory records so unsaved demo edits survive.
    setTimeout(() => setIsFetching(false), MOCK_REFRESH_MS)
  }

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
      current = current.parentId
        ? recordsById.get(current.parentId)
        : undefined
    }
    return path
  }, [viewing, recordsById])

  const deletingDescendants = useMemo(
    () =>
      deleting ? collectDescendantIds(records, deleting.id).size : 0,
    [records, deleting],
  )

  // ── Mock CRUD (state only — no API) ────────────────────────────────────
  const handleSubmit = (values: ServicePointFormValues) => {
    if (editing) {
      const updated = recordFromForm(values, {
        id: editing.id,
        assignedUsers: editing.assignedUsers,
        createdAt: editing.createdAt,
      })
      setRecords((previous) =>
        previous.map((record) =>
          record.id === editing.id ? updated : record,
        ),
      )
      toast.success(`Service point “${updated.name}” updated.`, {
        description: 'Mock data — changes reset on reload.',
      })
      return
    }
    const created = recordFromForm(values, {
      id: `sp-${crypto.randomUUID()}`,
      // Real counts arrive with the Service Point Assignment module.
      assignedUsers: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    setRecords((previous) => [...previous, created])
    // Reveal the new row immediately, wherever it landed in the tree.
    if (created.parentId) {
      setExpandedIds((previous) => new Set([...previous, created.parentId!]))
    }
    toast.success(`Service point “${created.name}” created.`, {
      description: 'Mock data — changes reset on reload.',
    })
  }

  const handleDelete = () => {
    if (!deleting) return
    const removed = new Set([
      deleting.id,
      ...collectDescendantIds(records, deleting.id),
    ])
    setRecords((previous) =>
      previous.filter((record) => !removed.has(record.id)),
    )
    toast.success(`Service point “${deleting.name}” deleted.`, {
      description: 'Mock data — changes reset on reload.',
    })
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
            Manage the service point hierarchy — regions, branches and
            sub-areas under one tree.
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
          isFetching={isFetching}
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
            size="icon"
            aria-label="Refresh"
            title="Refresh"
            disabled={isPending || isFetching}
            onClick={refresh}
          >
            <RefreshCw
              className={cn('h-4 w-4', isFetching && 'animate-spin')}
              strokeWidth={1.75}
            />
          </Button>
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
        servicePoint={viewing}
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
