import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  SearchX,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { cn } from '#/lib/utils.ts'
import type {
  ImportAssignmentStatus,
  ImportRowReport,
  ImportSummary,
} from '../api/import-merchants.ts'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

/** Quick filters over the already-processed preview rows. */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'valid', label: 'Valid' },
  { key: 'invalid', label: 'Invalid' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'manual', label: 'Manual Assignment' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

/** True when the (already validated) row belongs to the quick filter. */
function matchesFilter(row: ImportRowReport, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'valid':
      return row.errors.length === 0
    case 'invalid':
      return row.errors.length > 0
    case 'assigned':
      return row.errors.length === 0 && row.assignmentStatus === 'ASSIGNED'
    case 'manual':
      return row.errors.length === 0 && row.assignmentStatus !== 'ASSIGNED'
  }
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

const formatCount = (value: number): string => value.toLocaleString('en-US')

/** Assignment outcome chip of one preview row. */
function AssignmentBadge({
  status,
}: {
  status: ImportAssignmentStatus | null
}) {
  switch (status) {
    case 'ASSIGNED':
      return <Badge variant="success">Assigned</Badge>
    case 'OUTSIDE_COVERAGE_RADIUS':
      return <Badge variant="sky">Outside Coverage Radius</Badge>
    case 'NO_ACTIVE_SERVICE_POINT':
      return <Badge variant="muted">No Active Service Point</Badge>
    default:
      return <span className="text-[#0E2748]/40">—</span>
  }
}

interface ImportPreviewTableProps {
  /** Every processed row — validated and assigned exactly once. */
  rows: Array<ImportRowReport>
  /** Backend summary; drives the quick-filter counters. */
  summary: ImportSummary
}

/**
 * The import preview list: quick filters, code/name search and pagination,
 * all client-side over the rows the backend already processed — switching
 * page, filter or search never re-validates or recomputes distances, and
 * only the current page is rendered.
 */
export function ImportPreviewTable({ rows, summary }: ImportPreviewTableProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const filterCounts: Record<FilterKey, number> = {
    all: summary.totalRows,
    valid: summary.validRows,
    invalid: summary.invalidRows,
    assigned: summary.assigned,
    manual: summary.needManualAssignment,
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(
      (row) =>
        matchesFilter(row, filter) &&
        (term === '' ||
          (row.merchantCode ?? '').toLowerCase().includes(term) ||
          (row.merchantName ?? '').toLowerCase().includes(term)),
    )
  }, [rows, filter, search])

  // Changing the filter or search term changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [filter, search])

  const { pageIndex, pageSize } = pagination
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize))
  // Clamp in-render (rather than an effect) so a shrinking row set never
  // paints an empty out-of-range page first.
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const pageRows = visibleRows.slice(
    safePageIndex * pageSize,
    (safePageIndex + 1) * pageSize,
  )
  const rangeStart = visibleRows.length === 0 ? 0 : safePageIndex * pageSize + 1
  const rangeEnd = safePageIndex * pageSize + pageRows.length

  return (
    <div className="space-y-3">
      {/* Quick filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className="text-xs"
          >
            {label} ({formatCount(filterCounts[key])})
          </Button>
        ))}
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search code or name…"
          containerClassName="ml-auto min-w-[200px] flex-none sm:max-w-[240px]"
        />
      </div>

      <Card className="overflow-x-auto border-[#DDE0EC]">
        <table className="w-full min-w-4xl text-left text-sm">
          <thead>
            <tr className="border-b border-[#DDE0EC] text-[11px] uppercase tracking-wider text-[#0E2748]/50">
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Row
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Merchant Code
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Merchant Name
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Latitude
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Longitude
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Nearest Service Point
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Distance (KM)
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Assignment Status
              </th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">
                Validation Result
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4">
                  <EmptyState
                    icon={SearchX}
                    iconChip
                    title="No rows match"
                    description="Try a different search term or quick filter."
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilter('all')
                          setSearch('')
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={row.rowNumber}
                className="border-b border-[#DDE0EC] last:border-0"
              >
                <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/50 tabular-nums">
                  {row.rowNumber}
                </td>
                <td className="px-4 py-2.5 font-medium whitespace-nowrap text-[#0E2748]/80 tabular-nums">
                  {row.merchantCode || '—'}
                </td>
                <td className="px-4 py-2.5 text-[#0E2748]/80">
                  {row.merchantName || (
                    <span className="text-[#0E2748]/40">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70 tabular-nums">
                  {row.latitude === null ? (
                    <span className="text-[#0E2748]/40">—</span>
                  ) : (
                    row.latitude
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70 tabular-nums">
                  {row.longitude === null ? (
                    <span className="text-[#0E2748]/40">—</span>
                  ) : (
                    row.longitude
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70">
                  {row.nearestServicePointName || (
                    <span className="text-[#0E2748]/40">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-[#0E2748]/70 tabular-nums">
                  {row.distanceKm === null ? (
                    <span className="text-[#0E2748]/40">—</span>
                  ) : (
                    row.distanceKm.toFixed(2)
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <AssignmentBadge status={row.assignmentStatus} />
                </td>
                <td className="px-4 py-2.5">
                  {row.errors.length === 0 ? (
                    <Badge variant="success">
                      <CircleCheck className="h-3 w-3" strokeWidth={2} />
                      Valid
                    </Badge>
                  ) : (
                    <span className="leading-tight">
                      <Badge variant="danger">
                        <CircleX className="h-3 w-3" strokeWidth={2} />
                        Invalid
                      </Badge>
                      {row.errors.map((error) => (
                        <span
                          key={error}
                          className="mt-1 block text-xs text-rose-600"
                        >
                          {error}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DDE0EC] px-4 py-3">
            <p className="text-xs text-[#0E2748]/60">
              Showing {formatCount(rangeStart)}–{formatCount(rangeEnd)} of{' '}
              {formatCount(visibleRows.length)} rows · Page{' '}
              {formatCount(safePageIndex + 1)} of {formatCount(pageCount)}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-[#0E2748]/60">
                <span>Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) =>
                    setPagination({ pageIndex: 0, pageSize: Number(value) })
                  }
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
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={safePageIndex === 0}
                  onClick={() =>
                    setPagination((previous) => ({
                      ...previous,
                      pageIndex: safePageIndex - 1,
                    }))
                  }
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </Button>
                {paginationItems(safePageIndex, pageCount).map((item, index) =>
                  item === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1 text-xs text-[#0E2748]/40"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      type="button"
                      variant={item === safePageIndex ? 'default' : 'ghost'}
                      size="icon-sm"
                      aria-label={`Page ${item + 1}`}
                      aria-current={item === safePageIndex ? 'page' : undefined}
                      onClick={() =>
                        setPagination((previous) => ({
                          ...previous,
                          pageIndex: item,
                        }))
                      }
                      className={cn(
                        'text-xs tabular-nums',
                        item !== safePageIndex &&
                          'text-[#0E2748]/70 hover:text-foreground',
                      )}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={safePageIndex >= pageCount - 1}
                  onClick={() =>
                    setPagination((previous) => ({
                      ...previous,
                      pageIndex: safePageIndex + 1,
                    }))
                  }
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
