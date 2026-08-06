import { useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useLegacyTable } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleArrowDown,
  CircleArrowUp,
  EllipsisVertical,
  Eye,
  Pencil,
  SearchX,
  Store,
  Trash2,
  TriangleAlert,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
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
import { cn } from '#/lib/utils.ts'
import { formatDateTime } from '../data/merchants.ts'
import type { MerchantRecord } from '../data/merchants.ts'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Column count used by the loading-skeleton rows. */
const SKELETON_ROWS = 6

/** Columns the backend list endpoint can sort by (server-side). */
export type MerchantSortColumn =
  'code' | 'name' | 'type' | 'picName' | 'phone' | 'status' | 'createdAt'

export interface MerchantSort {
  column: MerchantSortColumn
  direction: 'asc' | 'desc'
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

interface MerchantsTableProps {
  /** The rows of the current (client-side) page only. */
  rows: Array<MerchantRecord>
  /** Rows matching the filters across all pages. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  isPending: boolean
  isError: boolean
  errorMessage: string
  onRetry: () => void
  /** True while a search/status/service point filter is active. */
  isFiltering: boolean
  onClearFilters: () => void
  /** Active sort; clicking a header cycles asc → desc → off. */
  sort: MerchantSort | null
  onSort: (column: MerchantSortColumn) => void
  onView: (record: MerchantRecord) => void
  onEdit: (record: MerchantRecord) => void
  onStatusToggle: (record: MerchantRecord) => void
  onDelete: (record: MerchantRecord) => void
}

export function MerchantsTable({
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
  sort,
  onSort,
  onView,
  onEdit,
  onStatusToggle,
  onDelete,
}: MerchantsTableProps) {
  const columns = useMemo<Array<LegacyColumnDef<MerchantRecord>>>(() => {
    /** Header button that shows and drives the column's sort state. */
    const sortableHeader = (label: string, column: MerchantSortColumn) => {
      const active = sort?.column === column
      const SortIcon = !active
        ? ChevronsUpDown
        : sort.direction === 'asc'
          ? ArrowUp
          : ArrowDown
      return (
        <button
          type="button"
          onClick={() => onSort(column)}
          aria-label={`Sort by ${label}`}
          className={cn(
            'inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-brand-900',
            active && 'text-brand-900',
          )}
        >
          {label}
          <SortIcon
            className={cn('h-3 w-3', !active && 'opacity-40')}
            strokeWidth={2}
          />
        </button>
      )
    }

    return [
      {
        id: 'code',
        header: () => sortableHeader('Merchant Code', 'code'),
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap text-brand-900/80 tabular-nums">
            {row.original.code}
          </span>
        ),
      },
      {
        id: 'name',
        header: () => sortableHeader('Merchant Name', 'name'),
        cell: ({ row }) => (
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-medium text-brand-900">
              {row.original.name}
            </span>
            {row.original.email && (
              <span className="block truncate text-[11px] text-brand-900/45">
                {row.original.email}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'type',
        header: () => sortableHeader('Merchant Type', 'type'),
        cell: ({ row }) =>
          row.original.type ? (
            <Badge variant="soft">{row.original.type}</Badge>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        id: 'picName',
        header: () => sortableHeader('PIC Name', 'picName'),
        cell: ({ row }) =>
          row.original.picName ? (
            <span className="whitespace-nowrap text-brand-900/70">
              {row.original.picName}
            </span>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        id: 'phone',
        header: () => sortableHeader('Phone Number', 'phone'),
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="whitespace-nowrap text-brand-900/70 tabular-nums">
              {row.original.phone}
            </span>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        // The service point name is joined server-side and not sortable there,
        // so this header stays plain.
        id: 'servicePoint',
        header: 'Service Point',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70">
            {row.original.servicePointName}
          </span>
        ),
      },
      {
        id: 'status',
        header: () => sortableHeader('Status', 'status'),
        cell: ({ row }) => (
          <StatusPill active={row.original.status === 'active'} />
        ),
      },
      {
        id: 'createdAt',
        header: () => sortableHeader('Created At', 'createdAt'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/60 tabular-nums">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original
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
                    Edit merchant
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onStatusToggle(record)}>
                    {record.status === 'active' ? (
                      <>
                        <CircleArrowDown
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CircleArrowUp
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(record)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
  }, [sort, onSort, onView, onEdit, onStatusToggle, onDelete])

  const table = useLegacyTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange,
    // The page filters, sorts and slices the full mock list itself, so the
    // table only renders the given rows and drives the page controls off the
    // filtered total.
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
                        column.id === 'name' ? 'w-32' : 'w-16',
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
                    title="No merchants match"
                    description="Try a different search term or filter."
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
                    icon={Store}
                    iconChip
                    title="No merchants yet"
                    description="Add the first merchant or import a batch from Excel."
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
            Showing {rangeStart}–{rangeEnd} of {total} merchants
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
