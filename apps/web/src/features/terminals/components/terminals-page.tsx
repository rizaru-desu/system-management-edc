import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
  PRODUCT_OPTIONS,
  TERMINAL_STATUSES,
  TERMINAL_STATUS_LABELS,
  WAREHOUSE_OPTIONS,
  getTerminals,
  saveTerminals,
} from '../data/terminals.ts'
import type { TerminalRecord, TerminalStatus } from '../data/terminals.ts'
import { TerminalFormModal } from './terminal-form-modal.tsx'
import type { TerminalFormValues } from './terminal-form-modal.tsx'
import { TerminalsTable } from './terminals-table.tsx'

/**
 * Terminal Lifecycle → Terminals: the physical EDC units per serial
 * number — the meeting point of Products (the model) and Warehouses (the
 * current location). UI-only for now — the fleet lives in a module-level
 * mock store (shared with the detail page); search, status/warehouse/
 * product filters and pagination all run client-side. In production units
 * are created by Inbound Shipment inspections; the manual form stays for
 * legacy-data migration and corrections.
 */
export function TerminalsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<Array<TerminalRecord>>(getTerminals)

  /** Every mutation writes both the page state and the shared mock store. */
  const commit = (next: Array<TerminalRecord>) => {
    setRecords(next)
    saveTerminals(next)
  }

  // ── Search & filters ───────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TerminalStatus>(
    'all',
  )
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  // Debounced copy of `search` so the list isn't re-filtered per keystroke.
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

  const filteredRecords = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return records.filter((record) => {
      const matchesTerm =
        term === '' || record.serialNumber.toLowerCase().includes(term)
      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter
      const matchesWarehouse =
        warehouseFilter === 'all' || record.warehouseId === warehouseFilter
      const matchesProduct =
        productFilter === 'all' || record.productId === productFilter
      return matchesTerm && matchesStatus && matchesWarehouse && matchesProduct
    })
  }, [records, debouncedSearch, statusFilter, warehouseFilter, productFilter])

  // ── Pagination (client-side over the filtered list) ────────────────────
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
  const [editing, setEditing] = useState<TerminalRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: TerminalRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openDetail = (record: TerminalRecord) => {
    void navigate({
      to: '/terminals/$terminalId',
      params: { terminalId: record.id },
    })
  }

  /** Mock uniqueness check on serial, ignoring the record being edited. */
  const isSerialTaken = (serial: string) => {
    const candidate = serial.trim().toLowerCase()
    return records.some(
      (record) =>
        record.id !== editing?.id &&
        record.serialNumber.trim().toLowerCase() === candidate,
    )
  }

  // ── Mock CRUD (local store only until the backend exists) ──────────────
  const handleSubmit = (values: TerminalFormValues) => {
    // The form validated the required selects before submitting.
    const shared = {
      serialNumber: values.serialNumber,
      productId: values.productId,
      warehouseId: values.warehouseId,
      status: values.status as TerminalStatus,
      condition: values.condition as TerminalRecord['condition'],
      merchantName: values.merchantName,
      entryDate: values.entryDate,
      notes: values.notes,
    }
    if (editing) {
      commit(
        records.map((record) =>
          record.id === editing.id ? { ...record, ...shared } : record,
        ),
      )
      toast.success(`Terminal “${values.serialNumber}” updated.`)
      return
    }
    commit([...records, { ...shared, id: `trm-${Date.now().toString(36)}` }])
    toast.success(`Terminal “${values.serialNumber}” created.`)
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
            {WAREHOUSE_OPTIONS.map((warehouse) => (
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
            {PRODUCT_OPTIONS.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.modelName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <TerminalsTable
        rows={pageRows}
        total={filteredRecords.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onView={openDetail}
        onEdit={openEdit}
      />

      <TerminalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        terminal={editing}
        isSerialTaken={isSerialTaken}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
