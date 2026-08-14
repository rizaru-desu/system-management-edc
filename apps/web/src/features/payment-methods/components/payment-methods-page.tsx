import { useState } from 'react'
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
 * checklist during Job Order settlement. Structure-only stage: search,
 * filter and the form render but nothing is wired — the api layer arrives
 * with the backend, replacing the empty list below.
 */
export function PaymentMethodsPage() {
  // ── Search & filter (unwired until the api layer lands) ────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentMethodStatus>(
    'all',
  )
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const isFiltering = search.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethodRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<PaymentMethodRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: PaymentMethodRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openDelete = (record: PaymentMethodRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  // Wired to the backend mutations once the api layer lands.
  const handleSubmit = (_values: PaymentMethodFormValues) => {
    setFormOpen(false)
  }

  const handleToggleStatus = (_record: PaymentMethodRecord) => {}

  const handleDelete = () => {
    setDeleteOpen(false)
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

      {/* Table (empty until the api layer lands) */}
      <PaymentMethodsTable
        rows={[]}
        total={0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={false}
        isError={false}
        errorMessage=""
        onRetry={() => {}}
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
        saving={false}
        duplicateNameConflict={0}
        duplicateCodeConflict={0}
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
