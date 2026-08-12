import { useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useLegacyTable } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  EllipsisVertical,
  Eye,
  PackageOpen,
  Pencil,
  SearchX,
  TriangleAlert,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { cn } from '#/lib/utils.ts'
import {
  SHIPMENT_STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_LABELS,
} from '../data/inbound-shipments.ts'
import type { InboundShipmentSummaryRecord } from '../data/inbound-shipments.ts'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Row count used by the loading-skeleton rows. */
const SKELETON_ROWS = 6

/** Same per-type badge looks as the warehouses module. */
const WAREHOUSE_TYPE_BADGES: Record<
  string,
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  central: { label: 'Central', variant: 'primary' },
  regional: { label: 'Regional', variant: 'sky' },
  'service-point': { label: 'Service Point', variant: 'success' },
}

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

interface InboundShipmentsTableProps {
  /** The rows of the current (server-side) page only. */
  rows: Array<InboundShipmentSummaryRecord>
  /** Rows matching the filters across all pages. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  isPending: boolean
  isError: boolean
  errorMessage: string
  onRetry: () => void
  /** True while a search/status/warehouse/partner filter is active. */
  isFiltering: boolean
  onClearFilters: () => void
  onOpen: (record: InboundShipmentSummaryRecord) => void
}

export function InboundShipmentsTable({
  rows,
  total,
  pagination,
  onPaginationChange,
  isPending,
  isError,
  errorMessage,
  onRetry,
  isFiltering,
  onClearFilters,
  onOpen,
}: InboundShipmentsTableProps) {
  const columns = useMemo<Array<LegacyColumnDef<InboundShipmentSummaryRecord>>>(
    () => [
      {
        id: 'doNumber',
        header: 'DO Number',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onOpen(row.original)}
            className="whitespace-nowrap font-medium text-brand-900 underline-offset-2 tabular-nums hover:underline"
          >
            {row.original.doNumber}
          </button>
        ),
      },
      {
        id: 'partner',
        header: 'Partner',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium text-brand-900/80">
            {row.original.partnerName}
          </span>
        ),
      },
      {
        id: 'warehouse',
        header: 'Destination Warehouse',
        cell: ({ row }) => {
          const badge = WAREHOUSE_TYPE_BADGES[row.original.warehouseType]
          return (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-brand-900/80">
                {row.original.warehouseName}
              </span>
              <Badge variant={badge.variant} size="sm">
                {badge.label}
              </Badge>
            </span>
          )
        },
      },
      {
        id: 'shipmentDate',
        header: 'Shipment Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/60 tabular-nums">
            {row.original.shipmentDate || '—'}
          </span>
        ),
      },
      {
        id: 'receivedDate',
        header: 'Received Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/60 tabular-nums">
            {row.original.receivedDate || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge className={SHIPMENT_STATUS_BADGE_CLASSES[row.original.status]}>
            {SHIPMENT_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'units',
        header: 'EDC Units',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70 tabular-nums">
            {row.original.manifestUnitCount}
          </span>
        ),
      },
      {
        id: 'inspected',
        header: 'Inspected',
        cell: ({ row }) => {
          const inspected = row.original.inspectedUnitCount
          const unitTotal = row.original.totalUnitCount
          if (unitTotal === 0) {
            return <span className="text-brand-900/40">—</span>
          }
          return (
            <span
              className={cn(
                'whitespace-nowrap tabular-nums',
                inspected === unitTotal
                  ? 'font-medium text-emerald-700'
                  : 'text-brand-900/70',
              )}
            >
              {inspected}/{unitTotal}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original
          const isDraft = record.status === 'draft'
          const inspectable =
            record.status === 'pending-inspection' ||
            record.status === 'inspection-in-progress'
          return (
            <div className="flex items-center justify-end gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Actions"
                    className="text-primary hover:text-foreground"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <EllipsisVertical className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem onSelect={() => onOpen(record)}>
                    {isDraft ? (
                      <>
                        <Pencil
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        Continue draft
                      </>
                    ) : inspectable ? (
                      <>
                        <ClipboardCheck
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        Open inspection
                      </>
                    ) : (
                      <>
                        <Eye
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        View summary
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [onOpen],
  )

  const table = useLegacyTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange,
    // The backend returns one page at a time, so the table only renders
    // the given rows and drives the controls off the filtered total.
    manualPagination: true,
    rowCount: total,
    getCoreRowModel: getCoreRowModel(),
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = pageIndex * pageSize + rows.length

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-5xl text-left text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'px-5 py-3 font-semibold whitespace-nowrap',
                    header.column.id === 'actions' && 'text-right',
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isPending &&
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={index} className="border-b border-brand-100">
                {columns.map((column) => (
                  <td key={column.id} className="px-5 py-3.5">
                    <Skeleton
                      className={cn(
                        'h-4',
                        column.id === 'doNumber' ? 'w-40' : 'w-16',
                        column.id === 'actions' && 'ml-auto w-8',
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          {isError && (
            <tr>
              <td colSpan={columns.length} className="px-5">
                <EmptyState
                  icon={TriangleAlert}
                  tone="danger"
                  title={errorMessage}
                  action={
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      Try again
                    </Button>
                  }
                />
              </td>
            </tr>
          )}
          {!isPending && !isError && total === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5">
                {isFiltering ? (
                  <EmptyState
                    icon={SearchX}
                    iconChip
                    title="No shipments match"
                    description="Try a different DO number, partner, status or warehouse filter."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={PackageOpen}
                    iconChip
                    title="No inbound shipments yet"
                    description="Record the first Delivery Order to start receiving stock."
                  />
                )}
              </td>
            </tr>
          )}
          {!isPending &&
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.original.id}
                className="border-b border-brand-100 last:border-0 hover:bg-brand-50/60"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-3.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {!isPending && !isError && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-3">
          <p className="text-xs text-brand-900/60">
            Showing {rangeStart}–{rangeEnd} of {total} shipments
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-brand-900/60">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[76px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              {paginationItems(pageIndex, table.getPageCount()).map(
                (item, index) =>
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
                      variant={item === pageIndex ? 'default' : 'ghost'}
                      size="icon-sm"
                      aria-label={`Page ${item + 1}`}
                      aria-current={item === pageIndex ? 'page' : undefined}
                      onClick={() => table.setPageIndex(item)}
                      className={cn(
                        'text-xs tabular-nums',
                        item !== pageIndex &&
                          'text-brand-900/70 hover:text-foreground',
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
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
