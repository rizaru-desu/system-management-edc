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
import { servicePointsListQueryOptions } from '#/features/service-points/index.ts'
import { useCreateMerchant } from '../api/create-merchant.ts'
import type { MerchantPayload } from '../api/create-merchant.ts'
import { useDeleteMerchant } from '../api/delete-merchant.ts'
import {
  isDuplicateCodeError,
  merchantsListQueryOptions,
} from '../api/list-merchants.ts'
import type { MerchantSortField } from '../api/list-merchants.ts'
import { merchantDetailQueryOptions } from '../api/merchant-detail.ts'
import {
  useSetMerchantStatus,
  useUpdateMerchant,
} from '../api/update-merchant.ts'
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
    type: blankOrNull(values.type),
    picName: blankOrNull(values.picName),
    phone: blankOrNull(values.phone),
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

/** Table sort column → the backend list endpoint's sortBy field. */
const SORT_FIELD_BY_COLUMN: Record<MerchantSortColumn, MerchantSortField> = {
  code: 'merchantCode',
  name: 'merchantName',
  type: 'merchantType',
  picName: 'picName',
  phone: 'phoneNumber',
  status: 'status',
  createdAt: 'createdAt',
}

/**
 * Merchant Management → Merchants. Search, status/service point filters,
 * sorting and pagination all run server-side (GET /merchants), and every
 * CRUD action goes through the backend API; the mutation hooks own toasts
 * and cache invalidation, so the table refreshes after every write.
 */
export function MerchantsPage() {
  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MerchantStatus>(
    'all',
  )
  const [servicePointFilter, setServicePointFilter] = useState<string>('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
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

  // ── Sorting (server-side; header clicks cycle asc → desc → off) ────────
  const [sort, setSort] = useState<MerchantSort | null>(null)

  const handleSort = (column: MerchantSortColumn) => {
    setSort((previous) => {
      if (previous?.column !== column) return { column, direction: 'asc' }
      if (previous.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
  }

  // ── Pagination (server-side) ───────────────────────────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term, a filter or the sort changes the row set, so
  // any page beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, statusFilter, servicePointFilter, sort])

  const listQuery = useQuery(
    merchantsListQueryOptions({
      search: debouncedSearch,
      status: statusFilter,
      servicePointId: servicePointFilter,
      sortBy: sort ? SORT_FIELD_BY_COLUMN[sort.column] : undefined,
      sortOrder: sort?.direction,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const merchants = listQuery.data?.merchants ?? []
  const total = listQuery.data?.total ?? 0

  // Service point options for the filter dropdown and the form select —
  // the live catalogue from the backend, never hardcoded.
  const servicePointsQuery = useQuery(
    servicePointsListQueryOptions({ pageSize: 100 }),
  )
  const servicePointOptions = useMemo(
    () =>
      (servicePointsQuery.data?.servicePoints ?? []).map((servicePoint) => ({
        id: servicePoint.id,
        code: servicePoint.code,
        name: servicePoint.name,
      })),
    [servicePointsQuery.data],
  )

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MerchantRecord | null>(null)
  // Bumped on every duplicate-code 409 so the form modal highlights the
  // code field without losing the entered values.
  const [duplicateConflict, setDuplicateConflict] = useState(0)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<MerchantRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<MerchantRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<MerchantRecord | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setDuplicateConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: MerchantRecord) => {
    setEditing(record)
    setDuplicateConflict(0)
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

  // The view dialog re-reads the record so it always shows fresh data even
  // when the cached list is stale (GET /merchants/:id).
  const detailQuery = useQuery({
    ...merchantDetailQueryOptions(viewing?.id ?? ''),
    enabled: viewOpen && viewing !== null,
  })

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createMerchant = useCreateMerchant()
  const updateMerchant = useUpdateMerchant()
  const deleteMerchant = useDeleteMerchant()
  const setMerchantStatus = useSetMerchantStatus()

  const saving = createMerchant.isPending || updateMerchant.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload keeps the user's input intact. A duplicate-code 409
  // additionally highlights the code field inline.
  const handleSubmit = (values: MerchantFormValues) => {
    const payload = payloadFromForm(values)
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateCodeError(error)) {
          setDuplicateConflict((previous) => previous + 1)
        }
      },
    }
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
          isFetching={listQuery.isFetching && !listQuery.isPending}
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
            {servicePointOptions.map((servicePoint) => (
              <SelectItem key={servicePoint.id} value={servicePoint.id}>
                {servicePoint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Merchant table */}
      <MerchantsTable
        rows={merchants}
        total={total}
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
        servicePointOptions={servicePointOptions}
        saving={saving}
        duplicateConflict={duplicateConflict}
        onSubmit={handleSubmit}
      />
      <MerchantViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        merchant={
          detailQuery.data && detailQuery.data.id === viewing?.id
            ? detailQuery.data
            : viewing
        }
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
