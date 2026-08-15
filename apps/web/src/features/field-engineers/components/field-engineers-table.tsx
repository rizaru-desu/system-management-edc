import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { getCoreRowModel, useLegacyTable } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Eye,
  HardHat,
  Pencil,
  SearchX,
  Trash2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'

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
import { specializationLabel } from '../data/field-engineers.ts'
import type {
  EngineerStatus,
  FieldEngineerRecord,
} from '../data/field-engineers.ts'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Row count used by the loading-skeleton rows. */
const SKELETON_ROWS = 5

const STATUS_STYLES: Record<EngineerStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  on_leave: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  inactive: 'bg-brand-50 text-brand-900/60 ring-brand-900/10',
}

const STATUS_LABELS: Record<EngineerStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  inactive: 'Inactive',
}

/** Duty-status pill of a completed profile. */
export function EngineerStatusPill({ status }: { status: EngineerStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset',
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

/** "Profile Complete" vs "Needs Setup" badge for the list + detail page. */
export function ProfileStatusBadge({ complete }: { complete: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset',
        complete
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-amber-50 text-amber-700 ring-amber-600/20',
      )}
    >
      {complete ? 'Profile Complete' : 'Needs Setup'}
    </span>
  )
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

interface FieldEngineersTableProps {
  /** The rows of the current (server-side) page only. */
  rows: Array<FieldEngineerRecord>
  /** Rows matching the filters across all pages. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  isPending: boolean
  isError: boolean
  errorMessage: string
  onRetry: () => void
  /** True while a search/warehouse/profile filter is active. */
  isFiltering: boolean
  onClearFilters: () => void
  /** Opens the profile form: completes it (no profile) or edits it. */
  onEditProfile: (record: FieldEngineerRecord) => void
  onRemoveProfile: (record: FieldEngineerRecord) => void
}

export function FieldEngineersTable({
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
  onEditProfile,
  onRemoveProfile,
}: FieldEngineersTableProps) {
  const columns = useMemo<Array<LegacyColumnDef<FieldEngineerRecord>>>(
    () => [
      {
        id: 'engineer',
        header: 'Engineer',
        cell: ({ row }) => (
          <Link
            to="/engineers/$userId"
            params={{ userId: row.original.userId }}
            className="group block"
          >
            <span className="block whitespace-nowrap font-medium text-brand-900 underline-offset-2 group-hover:underline">
              {row.original.name}
            </span>
            <span className="block text-xs text-brand-900/50">
              {row.original.email}
            </span>
          </Link>
        ),
      },
      {
        id: 'warehouse',
        header: 'Warehouse / Service Point',
        cell: ({ row }) =>
          row.original.profile?.warehouseName ? (
            <span className="whitespace-nowrap text-brand-900/80">
              {row.original.profile.warehouseName}
            </span>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        id: 'region',
        header: 'Coverage Region',
        cell: ({ row }) =>
          row.original.profile ? (
            <span className="whitespace-nowrap text-brand-900/80">
              {row.original.profile.coverageRegion}
            </span>
          ) : (
            <span className="text-brand-900/40">—</span>
          ),
      },
      {
        id: 'specializations',
        header: 'Specializations',
        cell: ({ row }) => {
          const keys = row.original.profile?.specializations ?? []
          if (keys.length === 0) {
            return <span className="text-brand-900/40">—</span>
          }
          return (
            <span className="flex max-w-[260px] flex-wrap gap-1">
              {keys.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-brand-900/70"
                >
                  {specializationLabel(key)}
                </span>
              ))}
            </span>
          )
        },
      },
      {
        id: 'profile',
        header: 'Profile',
        cell: ({ row }) => {
          const profile = row.original.profile
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              <ProfileStatusBadge complete={Boolean(profile)} />
              {profile && <EngineerStatusPill status={profile.status} />}
            </span>
          )
        },
      },
      {
        id: 'jobOrders',
        header: 'Active Job Orders',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-brand-900/70 tabular-nums">
            {row.original.activeJobOrders}
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
                    onClick={(event) => event.stopPropagation()}
                  >
                    <EllipsisVertical className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem asChild>
                    <Link
                      to="/engineers/$userId"
                      params={{ userId: record.userId }}
                    >
                      <Eye
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.75}
                      />
                      View detail
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEditProfile(record)}>
                    {record.profile ? (
                      <Pencil
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <UserPlus
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.75}
                      />
                    )}
                    {record.profile ? 'Edit profile' : 'Complete profile'}
                  </DropdownMenuItem>
                  {record.profile && (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onRemoveProfile(record)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      Remove profile
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [onEditProfile, onRemoveProfile],
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
                        column.id === 'engineer' ? 'w-36' : 'w-20',
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
                    title="No field engineers match"
                    description="Try a different name, warehouse or profile filter."
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
                    icon={HardHat}
                    iconChip
                    title="No field engineers yet"
                    description="Users get listed here once they hold the Field Service Engineer role in Users & Roles."
                  />
                )}
              </td>
            </tr>
          )}
          {!isPending &&
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.original.userId}
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
            Showing {rangeStart}–{rangeEnd} of {total} field engineers
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
