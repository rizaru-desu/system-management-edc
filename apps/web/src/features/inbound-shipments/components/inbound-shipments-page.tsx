import { useEffect, useMemo, useState } from 'react'
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
import {
  PARTNER_OPTIONS,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_WAREHOUSE_OPTIONS,
  getShipments,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentRecord,
  ShipmentStatus,
} from '../data/inbound-shipments.ts'
import { InboundShipmentsTable } from './inbound-shipments-table.tsx'

/**
 * Terminal Lifecycle → Inbound Shipments: the Delivery Orders recorded
 * from partners and their inspection state. UI-only stage — the list reads
 * the shared mock store; a future backend swaps this for GET
 * /inbound-shipments with server-side filters, the same integration path
 * the sibling modules took.
 */
export function InboundShipmentsPage() {
  const navigate = useNavigate()

  // ── Search & filters ───────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ShipmentStatus>(
    'all',
  )
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [partnerFilter, setPartnerFilter] = useState('all')

  const isFiltering =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    partnerFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setWarehouseFilter('all')
    setPartnerFilter('all')
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return getShipments().filter((shipment) => {
      if (
        term &&
        !shipment.doNumber.toLowerCase().includes(term) &&
        !shipment.partnerName.toLowerCase().includes(term)
      ) {
        return false
      }
      if (statusFilter !== 'all' && shipment.status !== statusFilter) {
        return false
      }
      if (
        warehouseFilter !== 'all' &&
        shipment.warehouseId !== warehouseFilter
      ) {
        return false
      }
      if (partnerFilter !== 'all' && shipment.partnerName !== partnerFilter) {
        return false
      }
      return true
    })
  }, [search, statusFilter, warehouseFilter, partnerFilter])

  // ── Pagination ─────────────────────────────────────────────────────────
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
  }, [search, statusFilter, warehouseFilter, partnerFilter])

  const pageRows = filtered.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  )

  const openShipment = (record: InboundShipmentRecord) => {
    // The detail route renders by status: draft → wizard, pending or
    // in-progress → inspection workspace, completed → summary.
    void navigate({
      to: '/inbound-shipments/$shipmentId',
      params: { shipmentId: record.id },
    })
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
            Inbound Shipments
          </h1>
          <p className="text-sm text-brand-900/60">
            Delivery Orders from partners — record the manifest, inspect the
            received units, and register the good ones as terminals.
          </p>
        </div>
        <Button onClick={() => void navigate({ to: '/inbound-shipments/new' })}>
          <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
          New inbound shipment
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search DO number or partner…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | ShipmentStatus)
          }
        >
          <SelectTrigger className="w-[210px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {SHIPMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {SHIPMENT_STATUS_LABELS[status]}
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
            {SHIPMENT_WAREHOUSE_OPTIONS.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Filter by partner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {PARTNER_OPTIONS.map((partner) => (
              <SelectItem key={partner} value={partner}>
                {partner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <InboundShipmentsTable
        rows={pageRows}
        total={filtered.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onOpen={openShipment}
      />
    </div>
  )
}
