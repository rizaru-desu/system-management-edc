import { useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useLegacyTable } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ChevronLeft,
  ChevronRight,
  Package,
  PackageOpen,
  Pencil,
  SearchX,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { cn } from '#/lib/utils.ts'
import type { ItemCategoryRecord } from '../data/item-categories.ts'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

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

interface ItemCategoriesTableProps {
  /** The rows of the current (client-side) page only. */
  rows: Array<ItemCategoryRecord>
  /** Rows matching the filters across all pages. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  /** True while a search/category filter is active. */
  isFiltering: boolean
  onClearFilters: () => void
  onEdit: (record: ItemCategoryRecord) => void
  /** Flips the row's active status straight from the table. */
  onToggleStatus: (record: ItemCategoryRecord) => void
}

export function ItemCategoriesTable({
  rows,
  total,
  pagination,
  onPaginationChange,
  isFiltering,
  onClearFilters,
  onEdit,
  onToggleStatus,
}: ItemCategoriesTableProps) {
  const columns = useMemo<Array<LegacyColumnDef<ItemCategoryRecord>>>(
    () => [
      {
        id: 'name',
        header: 'Item Name',
        cell: ({ row }) => (
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-medium text-brand-900">
              {row.original.name}
            </span>
            {row.original.description && (
              <span className="block max-w-xs truncate text-[11px] text-brand-900/45">
                {row.original.description}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'code',
        header: 'Item Code',
        cell: ({ row }) =>
          row.original.code ? (
            <span className="font-medium whitespace-nowrap text-brand-900/80 tabular-nums">
              {row.original.code}
            </span>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        id: 'category',
        header: 'Accessory Category',
        cell: ({ row }) => (
          <Badge variant="soft">{row.original.category}</Badge>
        ),
      },
      {
        id: 'unit',
        header: 'Unit',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70">
            {row.original.unit}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const record = row.original
          const active = record.status === 'active'
          return (
            <div className="flex items-center gap-2.5">
              <Switch
                size="sm"
                checked={active}
                onCheckedChange={() => onToggleStatus(record)}
                aria-label={
                  active
                    ? `Deactivate ${record.name}`
                    : `Activate ${record.name}`
                }
                className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
              />
              <StatusPill active={active} />
            </div>
          )
        },
      },
      {
        id: 'productUsage',
        header: 'Used in Products',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1.5 text-brand-900/70 tabular-nums">
                <Package
                  className="h-3.5 w-3.5 text-primary"
                  strokeWidth={1.75}
                />
                {row.original.productUsageCount}
              </span>
            </TooltipTrigger>
            <TooltipContent className="border-brand-900 bg-brand-900 text-white">
              Products listing this item as standard completeness.
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit item"
              aria-label={`Edit ${row.original.name}`}
              className="text-primary hover:text-foreground"
              onClick={() => onEdit(row.original)}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onToggleStatus],
  )

  const table = useLegacyTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange,
    // The page slices the filtered mock list itself, so the table only
    // renders the given page rows and drives the controls off the total.
    manualPagination: true,
    rowCount: total,
    getCoreRowModel: getCoreRowModel(),
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = pageIndex * pageSize + rows.length

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-3xl text-left text-sm">
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
                    title="No items match"
                    description="Try a different search term or category filter."
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
                    title="No items yet"
                    description="Add the first completeness item to start the catalogue."
                  />
                )}
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => (
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

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-3">
          <p className="text-xs text-brand-900/60">
            Showing {rangeStart}–{rangeEnd} of {total} items
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
