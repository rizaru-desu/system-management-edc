import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
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
import { useCreateTerminal } from '../api/create-terminal.ts'
import {
  terminalProductOptionsQueryOptions,
  terminalWarehouseOptionsQueryOptions,
} from '../api/form-options.ts'
import {
  isDuplicateSerialError,
  terminalsListQueryOptions,
} from '../api/list-terminals.ts'
import { useUpdateTerminal } from '../api/update-terminal.ts'
import { TERMINAL_STATUSES, TERMINAL_STATUS_LABELS } from '../data/terminals.ts'
import type { TerminalRecord, TerminalStatus } from '../data/terminals.ts'
import { TerminalFormModal } from './terminal-form-modal.tsx'
import type { TerminalFormValues } from './terminal-form-modal.tsx'
import { TerminalsTable } from './terminals-table.tsx'

/**
 * Terminal Lifecycle → Terminals: the physical EDC units per serial
 * number — the meeting point of Products (the model) and Warehouses (the
 * current location). Search, status/warehouse/product filters and
 * pagination all run server-side (GET /terminals, display fields joined),
 * and every write goes through the backend API; the mutation hooks own
 * toasts and cache invalidation. In production units are created by
 * Inbound Shipment inspections; the manual form stays for legacy-data
 * migration and corrections.
 */
export function TerminalsPage() {
  const navigate = useNavigate()

  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TerminalStatus>(
    'all',
  )
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    statusFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    productFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setWarehouseFilter('all')
    setProductFilter('all')
  }

  // Warehouse/product filter dropdowns share the form's options endpoints.
  const warehouseOptionsQuery = useQuery(terminalWarehouseOptionsQueryOptions())
  const productOptionsQuery = useQuery(terminalProductOptionsQueryOptions())
  const warehouseOptions = warehouseOptionsQuery.data ?? []
  const productOptions = productOptionsQuery.data ?? []

  // ── Pagination (server-side) ───────────────────────────────────────────
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
  }, [debouncedSearch, statusFilter, warehouseFilter, productFilter])

  const listQuery = useQuery(
    terminalsListQueryOptions({
      search: debouncedSearch,
      status: statusFilter,
      warehouseId: warehouseFilter,
      productId: productFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const terminals = listQuery.data?.terminals ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TerminalRecord | null>(null)
  // Bumped on every duplicate-serial 409 so the form modal highlights the
  // serial field without losing the entered values.
  const [duplicateSerialConflict, setDuplicateSerialConflict] = useState(0)

  const openCreate = () => {
    setEditing(null)
    setDuplicateSerialConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: TerminalRecord) => {
    setEditing(record)
    setDuplicateSerialConflict(0)
    setFormOpen(true)
  }

  const openDetail = (record: TerminalRecord) => {
    void navigate({
      to: '/terminals/$terminalId',
      params: { terminalId: record.id },
    })
  }

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createTerminal = useCreateTerminal()
  const updateTerminal = useUpdateTerminal()

  const saving = createTerminal.isPending || updateTerminal.isPending

  // The form stays open (with its submit disabled) until the save lands,
  // so a rejected payload keeps the user's input intact; a duplicate-serial
  // 409 additionally highlights the field inline.
  const handleSubmit = (values: TerminalFormValues) => {
    // The form validated the required selects before submitting.
    const payload = {
      serialNumber: values.serialNumber,
      productId: values.productId,
      warehouseId: values.warehouseId || null,
      status: values.status as TerminalStatus,
      condition: values.condition as TerminalRecord['condition'],
      merchantId: values.merchantId || null,
      entryDate: values.entryDate,
      notes: values.notes,
    }
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateSerialError(error)) {
          setDuplicateSerialConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateTerminal.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createTerminal.mutate(payload, callbacks)
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Terminal Lifecycle
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Terminals
          </h1>
          <p className="text-sm text-brand-900/60">
            Every physical EDC unit per serial number — its model, current
            warehouse and lifecycle status.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
          Add terminal
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search serial number…"
          containerClassName="min-w-[240px] sm:max-w-xs"
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | TerminalStatus)
          }
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TERMINAL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {TERMINAL_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouseOptions.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {/* Figure-space indent mirrors the tree depth. */}
                {'  '.repeat(warehouse.depth)}
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Filter by product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {productOptions.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.modelName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <TerminalsTable
        rows={terminals}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load terminals.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onView={openDetail}
        onEdit={openEdit}
      />

      <TerminalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        terminal={editing}
        saving={saving}
        duplicateSerialConflict={duplicateSerialConflict}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
