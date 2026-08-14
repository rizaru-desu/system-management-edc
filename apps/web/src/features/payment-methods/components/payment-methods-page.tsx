import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
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
  isDuplicateCodeError,
  isDuplicateNameError,
  paymentMethodsListQueryOptions,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useTogglePaymentMethodStatus,
  useUpdatePaymentMethod,
} from '../api/payment-methods.ts'
import type { PaymentMethodPayload } from '../api/payment-methods.ts'
import type {
  PaymentMethodRecord,
  PaymentMethodStatus,
} from '../data/payment-methods.ts'
import { DeletePaymentMethodDialog } from './delete-payment-method-dialog.tsx'
import { PaymentMethodFormModal } from './payment-method-form-modal.tsx'
import type { PaymentMethodFormValues } from './payment-method-form-modal.tsx'
import { PaymentMethodsTable } from './payment-methods-table.tsx'

/**
 * Administration → Payment Methods: the payment types a product can
 * support, which will later drive the auto-generated transaction test
 * checklist during Job Order settlement. Search, status filter and
 * pagination all run server-side; every write goes through the backend
 * API — the mutation hooks own toasts and cache invalidation.
 */
export function PaymentMethodsPage() {
  // ── Search & filter (server-side; search debounced) ────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentMethodStatus>(
    'all',
  )
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Changing the search term or filter changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, statusFilter])

  const isFiltering = debouncedSearch.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
  }

  const listQuery = useQuery(
    paymentMethodsListQueryOptions({
      search: debouncedSearch,
      status: statusFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const methods = listQuery.data?.paymentMethods ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethodRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<PaymentMethodRecord | null>(null)
  // Bumped on every duplicate 409 so the form modal highlights the field
  // without losing the entered values.
  const [duplicateNameConflict, setDuplicateNameConflict] = useState(0)
  const [duplicateCodeConflict, setDuplicateCodeConflict] = useState(0)

  const openCreate = () => {
    setEditing(null)
    setDuplicateNameConflict(0)
    setDuplicateCodeConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: PaymentMethodRecord) => {
    setEditing(record)
    setDuplicateNameConflict(0)
    setDuplicateCodeConflict(0)
    setFormOpen(true)
  }

  const openDelete = (record: PaymentMethodRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createMethod = useCreatePaymentMethod()
  const updateMethod = useUpdatePaymentMethod()
  const toggleStatus = useTogglePaymentMethodStatus()
  const deleteMethod = useDeletePaymentMethod()

  const saving = createMethod.isPending || updateMethod.isPending

  // The form stays open (submit disabled) until the save lands, so a
  // rejected payload keeps the user's input; a duplicate-name/code 409
  // additionally highlights the field inline.
  const handleSubmit = (values: PaymentMethodFormValues) => {
    const payload: PaymentMethodPayload = {
      name: values.name,
      code: values.code || null,
      description: values.description || null,
      status: values.status === 'active' ? 'ACTIVE' : 'INACTIVE',
    }
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateNameError(error)) {
          setDuplicateNameConflict((previous) => previous + 1)
        }
        if (isDuplicateCodeError(error)) {
          setDuplicateCodeConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateMethod.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createMethod.mutate(payload, callbacks)
  }

  const handleToggleStatus = (record: PaymentMethodRecord) => {
    toggleStatus.mutate({ id: record.id })
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteMethod.mutate(
      { id: deleting.id },
      {
        onSuccess: () => setDeleteOpen(false),
        onError: () => setDeleteOpen(false),
      },
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
            Payment Methods
          </h1>
          <p className="text-sm text-brand-900/60">
            The payment types a product can support — QRIS, cards, e-wallets.
            Products link these on their Payment Methods tab, and the Job Order
            settlement checklist will be generated from them.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Add Payment Method
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search payment method…"
          containerClassName="min-w-[240px] sm:max-w-xs"
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | PaymentMethodStatus)
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <PaymentMethodsTable
        rows={methods}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load the payment methods.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={openDelete}
      />

      <PaymentMethodFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        method={editing}
        saving={saving}
        duplicateNameConflict={duplicateNameConflict}
        duplicateCodeConflict={duplicateCodeConflict}
        onSubmit={handleSubmit}
      />

      <DeletePaymentMethodDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        method={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
