import { useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useLegacyTable } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  EllipsisVertical,
  Eye,
  Pencil,
  SearchX,
  Warehouse,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { cn } from '#/lib/utils.ts'
import { WAREHOUSE_TYPE_LABELS } from '../data/warehouses.ts'
import type { WarehouseRecord, WarehouseType } from '../data/warehouses.ts'
import type { WarehouseRow } from '../lib/tree.ts'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Horizontal offset per hierarchy level in the tree column. */
const INDENT_PER_LEVEL = 22

/** One badge look per hierarchy level, so types read at a glance. */
const TYPE_BADGE_VARIANTS: Record<
  WarehouseType,
  React.ComponentProps<typeof Badge>['variant']
> = {
  central: 'primary',
  regional: 'sky',
  'service-point': 'success',
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

interface WarehousesTableProps {
  /** The visible (expansion-aware) rows of the current page only. */
  rows: Array<WarehouseRow>
  /** Visible rows across all pages, after search/type/region filtering. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  /** True while the tree is being pruned by an active search/filter. */
  isFiltering: boolean
  /** Expansion is locked while filtering — matches must stay visible. */
  onToggleExpand: (id: string) => void
  onClearFilters: () => void
  onView: (record: WarehouseRecord) => void
  onEdit: (record: WarehouseRecord) => void
}

export function WarehousesTable({
  rows,
  total,
  pagination,
  onPaginationChange,
  isFiltering,
  onToggleExpand,
  onClearFilters,
  onView,
  onEdit,
}: WarehousesTableProps) {
  const columns = useMemo<Array<LegacyColumnDef<WarehouseRow>>>(
    () => [
      {
        id: 'name',
        header: 'Warehouse Name',
        cell: ({ row }) => {
          const { record, depth, hasChildren, expanded, childCount } =
            row.original
          return (
            <div
              className="flex items-center gap-1.5"
              style={{ paddingLeft: depth * INDENT_PER_LEVEL }}
            >
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={
                    expanded
                      ? `Collapse ${record.name}`
                      : `Expand ${record.name}`
                  }
                  aria-expanded={expanded}
                  // While a search/filter is active the tree is force-expanded
                  // so no match can hide inside a collapsed branch.
                  disabled={isFiltering}
                  onClick={() => onToggleExpand(record.id)}
                  className="text-brand-900/50 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight
                    className={cn(
                      'transition-transform duration-200',
                      expanded && 'rotate-90',
                    )}
                    strokeWidth={2}
                  />
                </Button>
              ) : (
                // Leaf marker keeps names aligned with expandable siblings.
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="h-1 w-1 rounded-full bg-brand-900/25" />
                </span>
              )}
              <span className="min-w-0 leading-tight">
                <button
                  type="button"
                  onClick={() => onView(record)}
                  className="block truncate font-medium text-brand-900 underline-offset-2 hover:underline"
                >
                  {record.name}
                </button>
                {hasChildren && (
                  <span className="block text-[11px] text-brand-900/45">
                    {childCount} direct{' '}
                    {childCount === 1 ? 'sub-warehouse' : 'sub-warehouses'}
                  </span>
                )}
              </span>
            </div>
          )
        },
      },
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap text-brand-900/80 tabular-nums">
            {row.original.record.code}
          </span>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={TYPE_BADGE_VARIANTS[row.original.record.type]}>
            {WAREHOUSE_TYPE_LABELS[row.original.record.type]}
          </Badge>
        ),
      },
      {
        id: 'region',
        header: 'Region',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70">
            {row.original.record.region}
          </span>
        ),
      },
      {
        id: 'pic',
        header: 'PIC',
        cell: ({ row }) => (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-brand-900/70">
              {row.original.record.picName}
            </span>
            {row.original.record.picContact && (
              <span className="block truncate text-[11px] text-brand-900/45">
                {row.original.record.picContact}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusPill active={row.original.record.status === 'active'} />
        ),
      },
      {
        id: 'terminals',
        header: 'Terminals',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1.5 text-brand-900/70 tabular-nums">
                <CreditCard
                  className="h-3.5 w-3.5 text-primary"
                  strokeWidth={1.75}
                />
                {row.original.record.terminalCount}
              </span>
            </TooltipTrigger>
            <TooltipContent className="border-brand-900 bg-brand-900 text-white">
              Terminals stored at this warehouse.
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original.record
          return (
            <div className="flex items-center justify-end gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Actions"
                    className="text-primary hover:text-foreground"
                    // Keep the trigger click from reaching the row.
                    onClick={(event) => event.stopPropagation()}
                  >
                    <EllipsisVertical className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem onSelect={() => onView(record)}>
                    <Eye className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(record)}>
                    <Pencil
                      className="h-4 w-4 text-primary"
                      strokeWidth={1.75}
                    />
                    Edit warehouse
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [isFiltering, onToggleExpand, onView, onEdit],
  )

  const table = useLegacyTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange,
    // The page slices the flattened tree itself (expansion changes the row
    // set), so the table only renders the given rows and drives the page
    // controls off the visible total.
    manualPagination: true,
    rowCount: total,
    getCoreRowModel: getCoreRowModel(),
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = pageIndex * pageSize + rows.length

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-4xl text-left text-sm">
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
          {total === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5">
                {isFiltering ? (
                  <EmptyState
                    icon={SearchX}
                    iconChip
                    title="No warehouses match"
                    description="Try a different search term, type or region filter."
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
                    icon={Warehouse}
                    iconChip
                    title="No warehouses yet"
                    description="Add the first warehouse to start building the hierarchy."
                  />
                )}
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.original.record.id}
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

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-3">
          <p className="text-xs text-brand-900/60">
            Showing {rangeStart}–{rangeEnd} of {total} visible warehouses
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
