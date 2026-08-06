import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, HousePlus } from 'lucide-react'
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
import { merchantsQueryOptions } from '../api/list-merchants.ts'
import { useCreateMerchant } from '../api/create-merchant.ts'
import { useDeleteMerchant } from '../api/delete-merchant.ts'
import { useSetMerchantStatus } from '../api/toggle-merchant-status.ts'
import { useUpdateMerchant } from '../api/update-merchant.ts'
import type { MerchantPayload } from '../api/mock-backend.ts'
import {
  MERCHANT_SERVICE_POINTS,
  MERCHANT_TYPE_LABELS,
} from '../data/merchants.ts'
import type { MerchantRecord, MerchantStatus } from '../data/merchants.ts'
import { DeleteMerchantDialog } from './delete-merchant-dialog.tsx'
import { ImportMerchantsModal } from './import-merchants-modal.tsx'
import { MerchantFormModal } from './merchant-form-modal.tsx'
import type { MerchantFormValues } from './merchant-form-modal.tsx'
import { MerchantViewModal } from './merchant-view-modal.tsx'
import { MerchantsTable } from './merchants-table.tsx'
import type { MerchantSort, MerchantSortColumn } from './merchants-table.tsx'
import { ToggleMerchantStatusDialog } from './toggle-merchant-status-dialog.tsx'

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto the API payload shape. */
function payloadFromForm(values: MerchantFormValues): MerchantPayload {
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    picName: values.picName,
    phone: values.phone,
    email: blankOrNull(values.email),
    address: blankOrNull(values.address),
    province: blankOrNull(values.province),
    city: blankOrNull(values.city),
    district: blankOrNull(values.district),
    postalCode: blankOrNull(values.postalCode),
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    servicePointId: values.servicePointId,
    status: values.status,
  }
}

/** The value a row is compared by when sorting on `column`. */
function sortValue(record: MerchantRecord, column: MerchantSortColumn): string {
  switch (column) {
    case 'code':
      return record.code
    case 'name':
      return record.name
    case 'type':
      return MERCHANT_TYPE_LABELS[record.type]
    case 'picName':
      return record.picName
    case 'phone':
      return record.phone
    case 'servicePoint':
      return record.servicePointName
    case 'status':
      return record.status
    case 'createdAt':
      return record.createdAt
  }
}

/**
 * Merchant Management → Merchants. UI-only for now: the list comes from a
 * mock in-memory backend (see api/mock-backend.ts) and search, status /
 * service point filters, sorting and pagination all run client-side over the
 * full catalogue. Every CRUD action goes through API-shaped mutation hooks
 * so wiring the real backend later only touches the api folder.
 */
export function MerchantsPage() {
  const listQuery = useQuery(merchantsQueryOptions())
  const records = useMemo(() => listQuery.data ?? [], [listQuery.data])

  // ── Search & filters ───────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MerchantStatus>(
    'all',
  )
  const [servicePointFilter, setServicePointFilter] = useState<string>('all')
  // Debounced copy of `search` so the list isn't re-filtered per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    statusFilter !== 'all' ||
    servicePointFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setServicePointFilter('all')
  }

  // ── Sorting (client-side; header clicks cycle asc → desc → off) ────────
  const [sort, setSort] = useState<MerchantSort | null>(null)

  const handleSort = (column: MerchantSortColumn) => {
    setSort((previous) => {
      if (previous?.column !== column) return { column, direction: 'asc' }
      if (previous.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
  }

  const visibleRows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    const filtered = records.filter((record) => {
      const matchesTerm =
        term === '' ||
        record.code.toLowerCase().includes(term) ||
        record.name.toLowerCase().includes(term) ||
        record.picName.toLowerCase().includes(term) ||
        record.phone.toLowerCase().includes(term)
      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter
      const matchesServicePoint =
        servicePointFilter === 'all' ||
        record.servicePointId === servicePointFilter
      return matchesTerm && matchesStatus && matchesServicePoint
    })
    if (!sort) return filtered
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort(
      (a, b) =>
        direction *
        sortValue(a, sort.column).localeCompare(
          sortValue(b, sort.column),
          'en',
          {
            numeric: true,
            sensitivity: 'base',
          },
        ),
    )
  }, [records, debouncedSearch, statusFilter, servicePointFilter, sort])

  // ── Pagination (client-side over the filtered rows) ────────────────────
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
  }, [debouncedSearch, statusFilter, servicePointFilter])

  // Deleting rows can shrink the row set below the current page — clamp to
  // the last page that still exists.
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

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MerchantRecord | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<MerchantRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<MerchantRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<MerchantRecord | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: MerchantRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openView = (record: MerchantRecord) => {
    setViewing(record)
    setViewOpen(true)
  }

  const openDelete = (record: MerchantRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const openStatusToggle = (record: MerchantRecord) => {
    setToggling(record)
    setStatusOpen(true)
  }

  // ── CRUD (mock backend; the mutation hooks own toasts + cache updates) ─
  const createMerchant = useCreateMerchant()
  const updateMerchant = useUpdateMerchant()
  const deleteMerchant = useDeleteMerchant()
  const setMerchantStatus = useSetMerchantStatus()

  const saving = createMerchant.isPending || updateMerchant.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload (e.g. duplicate code) keeps the user's input intact.
  const handleSubmit = (values: MerchantFormValues) => {
    const payload = payloadFromForm(values)
    const callbacks = { onSuccess: () => setFormOpen(false) }
    if (editing) {
      updateMerchant.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createMerchant.mutate(payload, callbacks)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteMerchant.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setMerchantStatus.mutate({
      id: toggling.id,
      status: toggling.status === 'active' ? 'inactive' : 'active',
    })
    setToggling(null)
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Merchant Management
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Merchants
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the merchant catalogue — profiles, locations and the service
            points that serve them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet
              className="h-4 w-4 text-primary"
              strokeWidth={1.75}
            />
            Import Excel
          </Button>
          <Button onClick={openCreate}>
            <HousePlus className="h-4 w-4" strokeWidth={1.75} />
            Add merchant
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search code, name, PIC or phone…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | MerchantStatus)
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
        <Select
          value={servicePointFilter}
          onValueChange={setServicePointFilter}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by service point" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All service points</SelectItem>
            {MERCHANT_SERVICE_POINTS.map((servicePoint) => (
              <SelectItem key={servicePoint.id} value={servicePoint.id}>
                {servicePoint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Merchant table */}
      <MerchantsTable
        rows={pageRows}
        total={visibleRows.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load merchants.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        sort={sort}
        onSort={handleSort}
        onView={openView}
        onEdit={openEdit}
        onStatusToggle={openStatusToggle}
        onDelete={openDelete}
      />

      <MerchantFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        merchant={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />
      <MerchantViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        merchant={viewing}
      />
      <DeleteMerchantDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        merchant={deleting}
        onConfirm={handleDelete}
      />
      <ToggleMerchantStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        merchant={toggling}
        onConfirm={handleStatusToggle}
      />
      <ImportMerchantsModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
