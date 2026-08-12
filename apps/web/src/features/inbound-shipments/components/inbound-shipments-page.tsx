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
import {
  shipmentPartnerOptionsQueryOptions,
  shipmentWarehouseOptionsQueryOptions,
} from '../api/form-options.ts'
import { shipmentsListQueryOptions } from '../api/list-inbound-shipments.ts'
import {
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentSummaryRecord,
  ShipmentStatus,
} from '../data/inbound-shipments.ts'
import { InboundShipmentsTable } from './inbound-shipments-table.tsx'

/**
 * Terminal Lifecycle → Inbound Shipments: the Delivery Orders recorded
 * from partners and their inspection state. Search, status/warehouse/
 * partner filters and pagination all run server-side (GET
 * /inbound-shipments, partner and warehouse display fields plus the
 * inspection counters joined).
 */
export function InboundShipmentsPage() {
  const navigate = useNavigate()

  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ShipmentStatus>(
    'all',
  )
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [partnerFilter, setPartnerFilter] = useState('all')
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
    partnerFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setWarehouseFilter('all')
    setPartnerFilter('all')
  }

  // The filter dropdowns share the wizard's options endpoints.
  const warehouseOptionsQuery = useQuery(shipmentWarehouseOptionsQueryOptions())
  const partnerOptionsQuery = useQuery(shipmentPartnerOptionsQueryOptions())
  const warehouseOptions = warehouseOptionsQuery.data ?? []
  const partnerOptions = partnerOptionsQuery.data ?? []

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
  }, [debouncedSearch, statusFilter, warehouseFilter, partnerFilter])

  const listQuery = useQuery(
    shipmentsListQueryOptions({
      search: debouncedSearch,
      status: statusFilter,
      warehouseId: warehouseFilter,
      partnerAccountId: partnerFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const shipments = listQuery.data?.shipments ?? []
  const total = listQuery.data?.total ?? 0

  const openShipment = (record: InboundShipmentSummaryRecord) => {
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
          isFetching={listQuery.isFetching && !listQuery.isPending}
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
            {warehouseOptions.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by partner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {partnerOptions.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.accountName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <InboundShipmentsTable
        rows={shipments}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load inbound shipments.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onOpen={openShipment}
      />
    </div>
  )
}
