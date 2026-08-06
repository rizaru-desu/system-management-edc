import { useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useLegacyTable } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ChevronLeft,
  ChevronRight,
  CircleArrowDown,
  CircleArrowUp,
  EllipsisVertical,
  Eye,
  PackageOpen,
  Pencil,
  SearchX,
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
import {
  PLATFORM_LABELS,
  UPDATE_TYPE_LABELS,
  formatDateTime,
  formatFileSize,
} from '../data/app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Column count used by the loading-skeleton rows. */
const SKELETON_ROWS = 6

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

interface AppReleasesTableProps {
  /** The rows of the current (server-side) page only. */
  rows: Array<AppReleaseRecord>
  /** Rows matching the filters across all pages. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  isPending: boolean
  isError: boolean
  errorMessage: string
  onRetry: () => void
  /** True while a search/platform/type/status filter is active. */
  isFiltering: boolean
  onClearFilters: () => void
  onView: (record: AppReleaseRecord) => void
  onEdit: (record: AppReleaseRecord) => void
  onPublishToggle: (record: AppReleaseRecord) => void
  onDelete: (record: AppReleaseRecord) => void
}

export function AppReleasesTable({
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
  onView,
  onEdit,
  onPublishToggle,
  onDelete,
}: AppReleasesTableProps) {
  const columns = useMemo<Array<LegacyColumnDef<AppReleaseRecord>>>(
    () => [
      {
        id: 'version',
        header: 'Version',
        cell: ({ row }) => (
          <span className="min-w-0 leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="font-medium whitespace-nowrap text-brand-900 tabular-nums">
                {row.original.versionName}
              </span>
              {row.original.isLatest && (
                <Badge variant="primary" size="sm">
                  Latest
                </Badge>
              )}
            </span>
            <span className="block text-[11px] text-brand-900/45 tabular-nums">
              build {row.original.versionCode}
            </span>
          </span>
        ),
      },
      {
        id: 'platform',
        header: 'Platform',
        cell: ({ row }) => (
          <Badge variant="soft">{PLATFORM_LABELS[row.original.platform]}</Badge>
        ),
      },
      {
        id: 'updateType',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.updateType === 'ota' ? 'sky' : 'soft'}>
            {UPDATE_TYPE_LABELS[row.original.updateType]}
          </Badge>
        ),
      },
      {
        id: 'minimumVersion',
        header: 'Min Version',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70 tabular-nums">
            {row.original.minimumVersion}
          </span>
        ),
      },
      {
        id: 'fileSize',
        header: 'Size',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70 tabular-nums">
            {formatFileSize(row.original.fileSize)}
          </span>
        ),
      },
      {
        id: 'forceUpdate',
        header: 'Force Update',
        cell: ({ row }) =>
          row.original.forceUpdate ? (
            <Badge variant="danger">Forced</Badge>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusPill active={row.original.isActive} />,
      },
      {
        id: 'publishedAt',
        header: 'Published At',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/60 tabular-nums">
            {formatDateTime(row.original.publishedAt)}
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
                    Edit release
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onPublishToggle(record)}>
                    {record.isActive ? (
                      <>
                        <CircleArrowDown
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <CircleArrowUp
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                        Publish
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
    ],
    [onView, onEdit, onPublishToggle, onDelete],
  )

  const table = useLegacyTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange,
    // Pagination happens server-side: the table only renders the given page
    // rows and drives the page controls off the filtered total.
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
          {isPending &&
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={index} className="border-b border-brand-100">
                {columns.map((column) => (
                  <td key={column.id} className="px-5 py-3.5">
                    <Skeleton
                      className={cn(
                        'h-4',
                        column.id === 'version' ? 'w-24' : 'w-16',
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
                    title="No releases match"
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
                    icon={PackageOpen}
                    iconChip
                    title="No releases yet"
                    description="Add the first APK or OTA release to start serving app updates."
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
            Showing {rangeStart}–{rangeEnd} of {total} releases
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
