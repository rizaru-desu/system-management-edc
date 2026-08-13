import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Boxes,
  ChevronRight,
  CreditCard,
  PackageSearch,
  TriangleAlert,
  Warehouse as WarehouseIcon,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
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
  edcStockLevelsQueryOptions,
  peripheralStockLevelsQueryOptions,
  stockItemOptionsQueryOptions,
  stockProductOptionsQueryOptions,
  stockSummaryQueryOptions,
  stockWarehousesQueryOptions,
} from '../api/stock-levels.ts'
import { LOW_STOCK_THRESHOLD } from '../data/stock-levels.ts'
import type {
  EdcStockRecord,
  StockWarehouse,
  StockWarehouseType,
} from '../data/stock-levels.ts'

const TABS = [
  { key: 'edc', label: 'EDC Stock' },
  { key: 'peripherals', label: 'Peripheral Stock' },
] as const

type TabKey = (typeof TABS)[number]['key']

/** Same per-type badge looks as the warehouses module. */
const WAREHOUSE_TYPE_BADGES: Record<
  StockWarehouseType,
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  central: { label: 'Central', variant: 'primary' },
  regional: { label: 'Regional', variant: 'sky' },
  'service-point': { label: 'Service Point', variant: 'success' },
}

const WAREHOUSE_TYPES: Array<StockWarehouseType> = [
  'central',
  'regional',
  'service-point',
]

const headerCellClasses = 'px-5 py-3 font-semibold whitespace-nowrap'
const headerRowClasses =
  'border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50'

/** One warehouse group of the EDC stock tree, with its rolled-up numbers. */
interface EdcTreeGroup {
  warehouse: StockWarehouse
  products: Array<EdcStockRecord>
  ownTotal: number
  /** Units sitting in descendant warehouses (any depth). */
  descendantTotal: number
  descendantCount: number
  hasChildren: boolean
}

function TableErrorRow({
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

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-brand-100">
          {Array.from({ length: columns }, (__, cellIndex) => (
            <td key={cellIndex} className="px-5 py-3.5">
              <Skeleton
                className={cn('h-4', cellIndex === 0 ? 'w-40' : 'w-16')}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Inventory → Stock Levels: where every EDC unit and accessory currently
 * sits. Summary cards on top, then two tabs — EDC stock grouped by the
 * warehouse hierarchy (collapse a Central to hide its Regional/Service
 * Point descendants) and peripheral stock with low-stock flags. Read-only:
 * stock only changes through the flows that move it. All numbers come
 * from the stock-levels endpoints; warehouse/type/product filters run
 * server-side.
 */
export function StockLevelsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('edc')

  // ── Filters (server-side) ──────────────────────────────────────────────
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | StockWarehouseType>(
    'all',
  )
  const [productFilter, setProductFilter] = useState('all')
  const [itemFilter, setItemFilter] = useState('all')

  const isFiltering =
    warehouseFilter !== 'all' || typeFilter !== 'all'
      ? true
      : activeTab === 'edc'
        ? productFilter !== 'all'
        : itemFilter !== 'all'

  const clearFilters = () => {
    setWarehouseFilter('all')
    setTypeFilter('all')
    setProductFilter('all')
    setItemFilter('all')
  }

  // ── Queries ────────────────────────────────────────────────────────────
  const summaryQuery = useQuery(stockSummaryQueryOptions())
  const warehousesQuery = useQuery(stockWarehousesQueryOptions())
  const productOptionsQuery = useQuery(stockProductOptionsQueryOptions())
  const itemOptionsQuery = useQuery(stockItemOptionsQueryOptions())
  const edcQuery = useQuery({
    ...edcStockLevelsQueryOptions({
      warehouseId: warehouseFilter,
      warehouseType: typeFilter,
      productId: productFilter,
    }),
    enabled: activeTab === 'edc',
  })
  const peripheralsQuery = useQuery({
    ...peripheralStockLevelsQueryOptions({
      warehouseId: warehouseFilter,
      warehouseType: typeFilter,
      itemCategoryId: itemFilter,
    }),
    enabled: activeTab === 'peripherals',
  })

  const summary = summaryQuery.data
  const warehouses = warehousesQuery.data ?? []
  const productOptions = productOptionsQuery.data ?? []
  const itemOptions = itemOptionsQuery.data ?? []
  const edcStock = edcQuery.data ?? []
  const peripheralStock = peripheralsQuery.data ?? []

  // ── Collapse state (EDC tree) ──────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleCollapsed = (warehouseId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(warehouseId)) next.delete(warehouseId)
      else next.add(warehouseId)
      return next
    })
  }

  // ── EDC stock tree (hierarchy from the live warehouse list) ────────────
  const parentById = new Map(warehouses.map((w) => [w.id, w.parentId]))

  const descendantsById = new Map<string, Array<string>>()
  for (const warehouse of warehouses) {
    let parentId = warehouse.parentId
    while (parentId) {
      const bucket = descendantsById.get(parentId)
      if (bucket) bucket.push(warehouse.id)
      else descendantsById.set(parentId, [warehouse.id])
      parentId = parentById.get(parentId) ?? null
    }
  }

  const quantityAt = (warehouseId: string) =>
    edcStock
      .filter((row) => row.warehouseId === warehouseId)
      .reduce((sum, row) => sum + row.quantity, 0)

  const groups: Array<EdcTreeGroup> = warehouses
    .filter((warehouse) => {
      if (warehouseFilter !== 'all' && warehouse.id !== warehouseFilter) {
        return false
      }
      if (typeFilter !== 'all' && warehouse.type !== typeFilter) return false
      return true
    })
    .map((warehouse) => {
      const products = edcStock.filter(
        (row) => row.warehouseId === warehouse.id,
      )
      const descendants = descendantsById.get(warehouse.id) ?? []
      return {
        warehouse,
        products,
        ownTotal: products.reduce((sum, row) => sum + row.quantity, 0),
        descendantTotal: descendants.reduce(
          (sum, id) => sum + quantityAt(id),
          0,
        ),
        descendantCount: descendants.length,
        hasChildren: warehouses.some((w) => w.parentId === warehouse.id),
      }
    })

  // A group is hidden when any ancestor is collapsed — unless a filter is
  // active, which flattens the tree (same behavior as the warehouses table).
  const isHidden = (warehouse: StockWarehouse): boolean => {
    if (isFiltering) return false
    let parentId = warehouse.parentId
    while (parentId) {
      if (collapsed.has(parentId)) return true
      parentId = parentById.get(parentId) ?? null
    }
    return false
  }

  const visibleGroups = groups.filter((group) => !isHidden(group.warehouse))
  const edcEmpty =
    !edcQuery.isPending &&
    visibleGroups.every(
      (group) => group.products.length === 0 && !group.hasChildren,
    )

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
          Inventory
        </p>
        <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
          Stock Levels
        </h1>
        <p className="text-sm text-brand-900/60">
          Where every EDC unit and accessory currently sits, across the
          warehouse hierarchy. Stock changes only through inbound inspections,
          transfers and the other flows that move it.
        </p>
      </div>

      {/* Summary cards */}
      {summaryQuery.isError ? (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
          <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : 'Failed to load the stock summary.'}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => void summaryQuery.refetch()}
          >
            Try again
          </button>
        </p>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <div className="flex items-center gap-2 text-brand-500">
              <CreditCard className="h-4 w-4" strokeWidth={1.75} />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/50">
                EDC in stock
              </p>
            </div>
            {summary ? (
              <p className="mt-1 text-3xl font-bold text-brand-900 tabular-nums">
                {summary.totalEdcInStock}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-16" />
            )}
            <p className="mt-0.5 text-xs text-brand-900/50">
              units ready for deployment
            </p>
          </div>
          <div className="rounded-xl border border-brand-100 p-4">
            <div className="flex items-center gap-2 text-brand-500">
              <WarehouseIcon className="h-4 w-4" strokeWidth={1.75} />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/50">
                By warehouse type
              </p>
            </div>
            {summary ? (
              <dl className="mt-2 space-y-1 text-sm">
                {WAREHOUSE_TYPES.map((type) => (
                  <div key={type} className="flex items-center justify-between">
                    <dt className="text-brand-900/60">
                      {WAREHOUSE_TYPE_BADGES[type].label}
                    </dt>
                    <dd className="font-semibold text-brand-900 tabular-nums">
                      {summary.edcByWarehouseType[type]}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Skeleton className="mt-2 h-16 w-full" />
            )}
          </div>
          <div className="rounded-xl border border-brand-100 p-4">
            <div className="flex items-center gap-2 text-brand-500">
              <Boxes className="h-4 w-4" strokeWidth={1.75} />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/50">
                Peripheral stock
              </p>
            </div>
            {summary ? (
              <p className="mt-1 text-3xl font-bold text-brand-900 tabular-nums">
                {summary.peripheralQuantity}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-16" />
            )}
            <p className="mt-0.5 text-xs text-brand-900/50">
              pcs across {summary?.peripheralLineCount ?? '…'} warehouse lines
            </p>
          </div>
          <div
            className={cn(
              'rounded-xl border p-4',
              summary && summary.lowStockLineCount > 0
                ? 'border-rose-200 bg-rose-50/60'
                : 'border-brand-100',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2',
                summary && summary.lowStockLineCount > 0
                  ? 'text-rose-600'
                  : 'text-brand-500',
              )}
            >
              <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/50">
                Low-stock lines
              </p>
            </div>
            {summary ? (
              <p
                className={cn(
                  'mt-1 text-3xl font-bold tabular-nums',
                  summary.lowStockLineCount > 0
                    ? 'text-rose-700'
                    : 'text-brand-900',
                )}
              >
                {summary.lowStockLineCount}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-16" />
            )}
            <p className="mt-0.5 text-xs text-brand-900/50">
              peripheral lines under {LOW_STOCK_THRESHOLD} units
            </p>
          </div>
        </div>
      )}

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
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {/* Figure-space indent mirrors the tree depth. */}
                {'  '.repeat(warehouse.depth)}
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(value as 'all' | StockWarehouseType)
          }
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouse types</SelectItem>
            {WAREHOUSE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {WAREHOUSE_TYPE_BADGES[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeTab === 'edc' ? (
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {productOptions.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {itemOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* EDC stock — warehouse hierarchy groups */}
      {activeTab === 'edc' && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className={headerRowClasses}>
                <th className={headerCellClasses}>Warehouse</th>
                <th className={headerCellClasses}>Product</th>
                <th className={cn(headerCellClasses, 'text-right')}>
                  Quantity In Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {(edcQuery.isPending || warehousesQuery.isPending) && (
                <SkeletonRows columns={3} />
              )}
              {edcQuery.isError && (
                <TableErrorRow
                  columns={3}
                  message={
                    edcQuery.error instanceof Error
                      ? edcQuery.error.message
                      : 'Failed to load the EDC stock levels.'
                  }
                  onRetry={() => edcQuery.refetch()}
                />
              )}
              {!edcQuery.isPending &&
                !warehousesQuery.isPending &&
                !edcQuery.isError &&
                edcEmpty && (
                  <tr>
                    <td colSpan={3} className="px-5">
                      <EmptyState
                        icon={PackageSearch}
                        iconChip
                        title="No EDC stock matches"
                        description="Try a different warehouse, type or product filter."
                        action={
                          isFiltering ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearFilters}
                            >
                              Clear filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              {!edcQuery.isPending &&
                !warehousesQuery.isPending &&
                !edcQuery.isError &&
                !edcEmpty &&
                visibleGroups.map((group) => (
                  <WarehouseGroupRows
                    key={group.warehouse.id}
                    group={group}
                    badge={WAREHOUSE_TYPE_BADGES[group.warehouse.type]}
                    isCollapsed={collapsed.has(group.warehouse.id)}
                    isFiltering={isFiltering}
                    onToggle={() => toggleCollapsed(group.warehouse.id)}
                  />
                ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Peripheral stock */}
      {activeTab === 'peripherals' && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className={headerRowClasses}>
                <th className={headerCellClasses}>Warehouse</th>
                <th className={headerCellClasses}>Item</th>
                <th className={cn(headerCellClasses, 'text-right')}>
                  Quantity
                </th>
                <th className={headerCellClasses}>Stock Level</th>
              </tr>
            </thead>
            <tbody>
              {peripheralsQuery.isPending && <SkeletonRows columns={4} />}
              {peripheralsQuery.isError && (
                <TableErrorRow
                  columns={4}
                  message={
                    peripheralsQuery.error instanceof Error
                      ? peripheralsQuery.error.message
                      : 'Failed to load the peripheral stock levels.'
                  }
                  onRetry={() => peripheralsQuery.refetch()}
                />
              )}
              {!peripheralsQuery.isPending &&
                !peripheralsQuery.isError &&
                peripheralStock.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5">
                      <EmptyState
                        icon={PackageSearch}
                        iconChip
                        title="No peripheral stock matches"
                        description="Try a different warehouse, type or item filter."
                        action={
                          isFiltering ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearFilters}
                            >
                              Clear filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              {!peripheralsQuery.isPending &&
                peripheralStock.map((row) => {
                  const badge = WAREHOUSE_TYPE_BADGES[row.warehouseType]
                  const low = row.quantity < LOW_STOCK_THRESHOLD
                  return (
                    <tr
                      key={`${row.warehouseId}-${row.itemCategoryId}`}
                      className="border-b border-brand-100 last:border-0 hover:bg-brand-50/60"
                    >
                      <td className="px-5 py-3.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-brand-900/80">
                            {row.warehouseName}
                          </span>
                          <Badge variant={badge.variant} size="sm">
                            {badge.label}
                          </Badge>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-medium text-brand-900">
                          {row.itemName}
                        </span>
                        <span className="text-[11px] text-brand-900/45">
                          {row.itemCode ?? '—'} · {row.itemUnit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-brand-900 tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="px-5 py-3.5">
                        {low ? (
                          <Badge variant="danger">Low stock</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/** One warehouse group: the header row plus its per-product rows. */
function WarehouseGroupRows({
  group,
  badge,
  isCollapsed,
  isFiltering,
  onToggle,
}: {
  group: EdcTreeGroup
  badge: {
    label: string
    variant: React.ComponentProps<typeof Badge>['variant']
  }
  isCollapsed: boolean
  isFiltering: boolean
  onToggle: () => void
}) {
  const { warehouse } = group
  return (
    <>
      {/* Warehouse header row */}
      <tr className="border-b border-brand-100 bg-brand-50/40">
        <td className="px-5 py-2.5" colSpan={2}>
          <span
            className="flex items-center gap-1.5"
            style={{ paddingLeft: isFiltering ? 0 : warehouse.depth * 20 }}
          >
            {group.hasChildren && !isFiltering ? (
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={!isCollapsed}
                aria-label={
                  isCollapsed
                    ? `Expand ${warehouse.name}`
                    : `Collapse ${warehouse.name}`
                }
                className="flex h-5 w-5 items-center justify-center rounded text-brand-900/50 hover:bg-brand-100"
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform',
                    !isCollapsed && 'rotate-90',
                  )}
                  strokeWidth={1.75}
                />
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}
            <span className="font-semibold text-brand-900">
              {warehouse.name}
            </span>
            <Badge variant={badge.variant} size="sm">
              {badge.label}
            </Badge>
            {isCollapsed && group.descendantTotal > 0 && (
              <span className="text-xs text-brand-900/45">
                +{group.descendantTotal} units in {group.descendantCount}{' '}
                sub-warehouse{group.descendantCount === 1 ? '' : 's'}
              </span>
            )}
          </span>
        </td>
        <td className="px-5 py-2.5 text-right font-semibold text-brand-900 tabular-nums">
          {group.ownTotal}
        </td>
      </tr>
      {/* Product rows */}
      {group.products.map((row) => (
        <tr
          key={`${row.warehouseId}-${row.productId}`}
          className="border-b border-brand-100 last:border-0 hover:bg-brand-50/60"
        >
          <td className="px-5 py-2.5" />
          <td className="px-5 py-2.5">
            <span className="block font-medium text-brand-900">
              {row.productModelName}
            </span>
            <span className="text-[11px] text-brand-900/45">
              {row.productBrand}
            </span>
          </td>
          <td className="px-5 py-2.5 text-right text-brand-900/80 tabular-nums">
            {row.quantity}
          </td>
        </tr>
      ))}
    </>
  )
}
