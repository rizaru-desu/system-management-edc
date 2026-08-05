import { useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useLegacyTable,
} from '@tanstack/react-table/legacy'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Loader2,
  Pencil,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
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
import { describeUserAgent, formatRelativeTime } from '../lib/format.ts'
import type { UserRecord } from '../data/users.ts'
import { RoleBadge } from './role-badge.tsx'


/** Pill styling per stored provider id; unknown providers fall back neutral. */
const SIGN_IN_BADGES: Record<string, { label: string; className: string }> = {
  credential: {
    label: 'Password',
    className: 'bg-brand-100 text-brand-900/70',
  },
  ldap: { label: 'LDAP', className: 'bg-sky-100 text-sky-700' },
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '?'
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

interface UsersTableProps {
  /** The rows of the current page only — pagination happens server-side. */
  users: Array<UserRecord>
  /** Rows matching the active filters across all pages. */
  total: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  errorMessage: string
  onRetry: () => void
  onViewPermissions: (user: UserRecord) => void
  /** Editing covers deactivation too — the form has an Active status switch. */
  onEdit: (user: UserRecord) => void
  onViewDevices: (user: UserRecord) => void
}

export function UsersTable({
  users,
  total,
  pagination,
  onPaginationChange,
  isPending,
  isError,
  isSuccess,
  errorMessage,
  onRetry,
  onViewPermissions,
  onEdit,
  onViewDevices,
}: UsersTableProps) {

  const columns = useMemo<Array<LegacyColumnDef<UserRecord>>>(
    () => [
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 text-xs font-semibold text-white">
              {initialsOf(row.original.name)}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-medium text-brand-900">
                {row.original.name}
              </p>
              <p className="truncate text-xs text-brand-900/50">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.length === 0 ? (
              // Only deactivated accounts may have every role stripped.
              <span className="text-xs text-brand-900/40">No roles</span>
            ) : (
              row.original.roles.map((role) => (
                <RoleBadge key={role} role={role} short />
              ))
            )}
          </div>
        ),
      },
      {
        id: 'signIn',
        header: 'Sign-in',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.signInMethods.length === 0 ? (
              // Seeded/provisioned accounts that never got a credential row.
              <span className="text-xs text-brand-900/40">—</span>
            ) : (
              row.original.signInMethods.map((method) => {
                const badge = SIGN_IN_BADGES[method] ?? {
                  label: method,
                  className: 'bg-brand-100 text-brand-900/70',
                }
                return (
                  <span
                    key={method}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                )
              })
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const active = row.original.status === 'active'
          const pill = (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                active
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'cursor-help bg-brand-100 text-brand-900/50',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  active ? 'bg-emerald-500' : 'bg-brand-900/30',
                )}
              />
              {active ? 'Active' : 'Inactive'}
            </span>
          )
          if (active) return pill
          // Hovering (or focusing) the Inactive pill reveals why the account
          // was deactivated — the form's optional "Deactivation reason".
          return (
            <Tooltip>
              <TooltipTrigger asChild>{pill}</TooltipTrigger>
              <TooltipContent className="border-brand-900 bg-brand-900 text-white">
                {row.original.banReason || 'No deactivation reason recorded.'}
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        id: 'lastActive',
        header: 'Last active',
        cell: ({ row }) => {
          const { lastActiveAt, lastIp, lastUserAgent } = row.original
          if (!lastActiveAt) {
            return <span className="text-brand-900/40">Never</span>
          }
          const device = lastUserAgent ? describeUserAgent(lastUserAgent) : null
          const detail = [device, lastIp].filter(Boolean).join(' · ')
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help leading-tight">
                  {/* Relative to render time, so the SSR'd label may lag the
                    client by a moment — not a real mismatch. */}
                  <p
                    className="text-brand-900/70 whitespace-nowrap"
                    suppressHydrationWarning
                  >
                    {formatRelativeTime(lastActiveAt)}
                  </p>
                  {detail && (
                    <p className="mt-0.5 text-xs whitespace-nowrap text-brand-900/45">
                      {detail}
                    </p>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="border-brand-900 bg-brand-900 text-white">
                {new Date(lastActiveAt).toLocaleString()}
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        id: 'joined',
        header: 'Joined',
        cell: ({ row }) => (
          <span className="text-brand-900/60 whitespace-nowrap tabular-nums">
            {row.original.createdAt}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original
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
                {/* The console is always light; the menu renders in a portal
                  outside the shell, so pin light colors against the
                  dark-theme tokens. */}
                <DropdownMenuContent
                  align="end"
                  className="theme-light border-brand-100 bg-white text-brand-900"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem onSelect={() => onViewDevices(user)}>
                    <Smartphone
                      className="h-4 w-4 text-primary"
                      strokeWidth={1.75}
                    />
                    Manage devices
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onViewPermissions(user)}>
                    <ShieldCheck
                      className="h-4 w-4 text-primary"
                      strokeWidth={1.75}
                    />
                    View permissions
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(user)}>
                    <Pencil
                      className="h-4 w-4 text-primary"
                      strokeWidth={1.75}
                    />
                    Edit user
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [onViewPermissions, onEdit, onViewDevices],
  )

  const table = useLegacyTable({
    data: users,
    columns,
    state: { pagination },
    onPaginationChange,
    // The backend serves one page at a time; the table only needs to render
    // the given rows and drive the page controls off the filtered total.
    manualPagination: true,
    rowCount: total,
    getCoreRowModel: getCoreRowModel(),
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = pageIndex * pageSize + users.length

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white">
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
          {isPending && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-sm text-brand-900/50"
              >
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  Loading...
                </div>
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-sm"
              >
                <p className="text-rose-600">{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onRetry}
                >
                  Try again
                </Button>
              </td>
            </tr>
          )}
          {isSuccess && total === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-sm text-brand-900/50"
              >
                No users match the current search or filter.
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
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

      {isSuccess && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-3">
          <p className="text-xs text-brand-900/60">
            Showing {rangeStart}–{rangeEnd} of {total}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-brand-900/60">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[76px] border-brand-100 bg-white text-xs text-brand-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="theme-light border-brand-100 bg-white text-brand-900">
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
    </div>
  )
}
