import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  SearchX,
  TriangleAlert,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Input } from '#/components/ui/input.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { cn } from '#/lib/utils.ts'
import {
  edcMovementsQueryOptions,
  movementWarehouseOptionsQueryOptions,
  peripheralMovementsQueryOptions,
} from '../api/stock-movements.ts'
import {
  EDC_MOVEMENT_TYPES,
  EDC_MOVEMENT_TYPE_BADGE_CLASSES,
  EDC_MOVEMENT_TYPE_LABELS,
  PERIPHERAL_MOVEMENT_REASONS,
  PERIPHERAL_MOVEMENT_REASON_BADGE_CLASSES,
  PERIPHERAL_MOVEMENT_REASON_LABELS,
} from '../data/stock-movements.ts'

const PAGE_SIZE = 10

/** Row count used by the loading-skeleton rows. */
const SKELETON_ROWS = 6

const TABS = [
  { key: 'edc', label: 'EDC Movements' },
  { key: 'peripherals', label: 'Peripheral Movements' },
] as const

type TabKey = (typeof TABS)[number]['key']

const fieldClasses =
  'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

/**
 * Numbered pagination items: first/last always visible, a window around the
 * current page, and ellipses for the gaps (e.g. 1 … 4 5 6 … 12).
 */
function paginationItems(
  current: number,
  pageCount: number,
): Array<number | 'ellipsis'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index)
  }
  const pages = new Set([0, pageCount - 1])
  for (let page = current - 1; page <= current + 1; page++) {
    if (page >= 0 && page < pageCount) pages.add(page)
  }
  const items: Array<number | 'ellipsis'> = []
  let previous = -1
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (previous !== -1 && page - previous > 1) items.push('ellipsis')
    items.push(page)
    previous = page
  }
  return items
}

/** The shared "Showing X–Y of Z" + pager footer of both movement tables. */
function TableFooter({
  page,
  total,
  shown,
  label,
  onPageChange,
}: {
  page: number
  total: number
  /** Rows actually on this page (the last page can be short). */
  shown: number
  label: string
  onPageChange: (page: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = page * PAGE_SIZE + shown
  if (total === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-3">
      <p className="text-xs text-brand-900/60">
        Showing {rangeStart}–{rangeEnd} of {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        {paginationItems(page, pageCount).map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-xs text-brand-900/40"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'default' : 'ghost'}
              size="icon-sm"
              aria-label={`Page ${item + 1}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                'text-xs tabular-nums',
                item !== page && 'text-brand-900/70 hover:text-foreground',
              )}
            >
              {item + 1}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  )
}

const headerCellClasses = 'px-5 py-3 font-semibold whitespace-nowrap'
const headerRowClasses =
  'border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50'
const bodyRowClasses = 'border-b border-brand-100 last:border-0'

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
        <tr key={rowIndex} className={bodyRowClasses}>
          {Array.from({ length: columns }, (__, cellIndex) => (
            <td key={cellIndex} className="px-5 py-3.5">
              <Skeleton
                className={cn('h-4', cellIndex === 0 ? 'w-28' : 'w-16')}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function ErrorRow({
  columns,
  message,
  onRetry,
}: {
  columns: number
  message: string
  onRetry: () => void
}) {
  return (
    <tr>
      <td colSpan={columns} className="px-5">
        <EmptyState
          icon={TriangleAlert}
          tone="danger"
          title={message}
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      </td>
    </tr>
  )
}

/**
 * Inventory → Stock Movements: the read-only log of every stock change.
 * Two tabs — serialized EDC units (from the terminal movement history,
 * with the movement type derived server-side from each status transition)
 * and peripheral quantities (from the stock movement log). Pure audit
 * trail: no create or edit actions; rows are written by the flows that
 * move stock. Search, filters and pagination all run server-side.
 */
export function StockMovementsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('edc')

  // ── Filters (server-side; search debounced) ────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // The type filter's options differ per tab, so switching tabs resets it.
  useEffect(() => {
    setTypeFilter('all')
    setSearch('')
    setDebouncedSearch('')
    setPage(0)
  }, [activeTab])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, warehouseFilter, typeFilter, dateFrom, dateTo])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    warehouseFilter !== 'all' ||
    typeFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setWarehouseFilter('all')
    setTypeFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const warehouseOptionsQuery = useQuery(movementWarehouseOptionsQueryOptions())
  const warehouseOptions = warehouseOptionsQuery.data ?? []

  const filters = {
    search: debouncedSearch,
    warehouseId: warehouseFilter,
    type: typeFilter,
    dateFrom,
    dateTo,
    page: page + 1,
    pageSize: PAGE_SIZE,
  }
  // Only the active tab's query runs; switching tabs starts the other.
  const edcQuery = useQuery({
    ...edcMovementsQueryOptions(filters),
    enabled: activeTab === 'edc',
  })
  const peripheralsQuery = useQuery({
    ...peripheralMovementsQueryOptions(filters),
    enabled: activeTab === 'peripherals',
  })
  const activeQuery = activeTab === 'edc' ? edcQuery : peripheralsQuery
  const total = activeQuery.data?.total ?? 0
  const edcRows = edcQuery.data?.movements ?? []
  const peripheralRows = peripheralsQuery.data?.movements ?? []

  const emptyState = isFiltering ? (
    <EmptyState
      icon={SearchX}
      iconChip
      title="No movements found"
      description="Try a different search term, warehouse, type or date range."
      action={
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={ArrowLeftRight}
      iconChip
      title="No movements yet"
      description="Movements appear here as stock is received, transferred and installed."
    />
  )

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
          Inventory
        </p>
        <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
          Stock Movements
        </h1>
        <p className="text-sm text-brand-900/60">
          The audit trail of every stock change — EDC units moving through their
          lifecycle and peripheral quantities changing at warehouses. Entries
          are recorded automatically by the flows that move stock.
        </p>
      </div>

      {/* Tab strip (same treatment as the products detail page). */}
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-brand-100">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'relative px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'text-brand-900'
                : 'text-brand-900/50 hover:text-brand-900/80',
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            activeTab === 'edc'
              ? 'Search serial number…'
              : 'Search item name or code…'
          }
          containerClassName="min-w-[220px] sm:max-w-xs"
          isFetching={activeQuery.isFetching && !activeQuery.isPending}
        />
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {activeTab === 'edc'
              ? EDC_MOVEMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EDC_MOVEMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))
              : PERIPHERAL_MOVEMENT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {PERIPHERAL_MOVEMENT_REASON_LABELS[reason]}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
        {/* Date range */}
        <div className="flex items-center gap-1.5 text-xs text-brand-900/50">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="From date"
            className={`h-9 w-[150px] text-xs ${fieldClasses}`}
          />
          <span>–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="To date"
            className={`h-9 w-[150px] text-xs ${fieldClasses}`}
          />
        </div>
      </div>

      {/* EDC movements */}
      {activeTab === 'edc' && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-5xl text-left text-sm">
            <thead>
              <tr className={headerRowClasses}>
                <th className={headerCellClasses}>Date</th>
                <th className={headerCellClasses}>Serial Number</th>
                <th className={headerCellClasses}>Product</th>
                <th className={headerCellClasses}>From Warehouse</th>
                <th className={headerCellClasses}>To Warehouse</th>
                <th className={headerCellClasses}>Movement Type</th>
                <th className={headerCellClasses}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {edcQuery.isPending && <SkeletonRows columns={7} />}
              {edcQuery.isError && (
                <ErrorRow
                  columns={7}
                  message={
                    edcQuery.error instanceof Error
                      ? edcQuery.error.message
                      : 'Failed to load the EDC movements.'
                  }
                  onRetry={() => edcQuery.refetch()}
                />
              )}
              {!edcQuery.isPending && !edcQuery.isError && total === 0 && (
                <tr>
                  <td colSpan={7} className="px-5">
                    {emptyState}
                  </td>
                </tr>
              )}
              {!edcQuery.isPending &&
                edcRows.map((row) => (
                  <tr key={row.id} className={bodyRowClasses}>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-900/60 tabular-nums">
                      {row.movedAt}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-medium text-brand-900 tabular-nums">
                      {row.serialNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-900/80">
                      {row.productModelName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-900/70">
                      {row.fromWarehouseName ?? (
                        <span className="text-brand-900/40">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-900/70">
                      {row.toWarehouseName ?? (
                        <span className="text-brand-900/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        className={
                          EDC_MOVEMENT_TYPE_BADGE_CLASSES[row.movementType]
                        }
                      >
                        {EDC_MOVEMENT_TYPE_LABELS[row.movementType]}
                      </Badge>
                    </td>
                    <td className="max-w-[280px] truncate px-5 py-3.5 text-xs text-brand-900/60">
                      {row.notes || (
                        <span className="text-brand-900/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!edcQuery.isPending && !edcQuery.isError && (
            <TableFooter
              page={page}
              total={total}
              shown={edcRows.length}
              label="movements"
              onPageChange={setPage}
            />
          )}
        </Card>
      )}

      {/* Peripheral movements */}
      {activeTab === 'peripherals' && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead>
              <tr className={headerRowClasses}>
                <th className={headerCellClasses}>Date</th>
                <th className={headerCellClasses}>Item</th>
                <th className={headerCellClasses}>Warehouse</th>
                <th className={headerCellClasses}>Qty Change</th>
                <th className={headerCellClasses}>Type</th>
                <th className={headerCellClasses}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {peripheralsQuery.isPending && <SkeletonRows columns={6} />}
              {peripheralsQuery.isError && (
                <ErrorRow
                  columns={6}
                  message={
                    peripheralsQuery.error instanceof Error
                      ? peripheralsQuery.error.message
                      : 'Failed to load the peripheral movements.'
                  }
                  onRetry={() => peripheralsQuery.refetch()}
                />
              )}
              {!peripheralsQuery.isPending &&
                !peripheralsQuery.isError &&
                total === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5">
                      {emptyState}
                    </td>
                  </tr>
                )}
              {!peripheralsQuery.isPending &&
                peripheralRows.map((row) => (
                  <tr key={row.id} className={bodyRowClasses}>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-900/60 tabular-nums">
                      {row.movedAt}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="block font-medium text-brand-900">
                        {row.itemName}
                      </span>
                      <span className="text-[11px] text-brand-900/45">
                        {row.itemCode ?? '—'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-900/70">
                      {row.warehouseName}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          row.quantityChange < 0
                            ? 'text-rose-600'
                            : 'text-emerald-700',
                        )}
                      >
                        {row.quantityChange > 0
                          ? `+${row.quantityChange}`
                          : row.quantityChange}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        className={
                          PERIPHERAL_MOVEMENT_REASON_BADGE_CLASSES[row.reason]
                        }
                      >
                        {PERIPHERAL_MOVEMENT_REASON_LABELS[row.reason]}
                      </Badge>
                    </td>
                    <td className="max-w-[280px] truncate px-5 py-3.5 text-xs text-brand-900/60">
                      {row.notes || (
                        <span className="text-brand-900/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!peripheralsQuery.isPending && !peripheralsQuery.isError && (
            <TableFooter
              page={page}
              total={total}
              shown={peripheralRows.length}
              label="movements"
              onPageChange={setPage}
            />
          )}
        </Card>
      )}
    </div>
  )
}
