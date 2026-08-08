import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { UserRoundPlus } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'

import { Button } from '#/components/ui/button.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  ACCOUNTS,
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '../data/accounts.ts'
import type { AccountStatus } from '../data/accounts.ts'
import { AccountsTable } from './accounts-table.tsx'

/**
 * Contract Management → Account. The index/list view over the account
 * catalogue: search, type/status filters and pagination all run client-side
 * over the local placeholder list until the backend endpoint lands; the
 * "Add Account" action routes to the existing Master Data form.
 */
export function AccountsPage() {
  const navigate = useNavigate()

  // ── Search & filters (client-side over the local list) ─────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all')

  const isFiltering =
    search.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  // ── Pagination (client-side) ───────────────────────────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term or a filter changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [search, typeFilter, statusFilter])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ACCOUNTS.filter((account) => {
      if (typeFilter !== 'all' && account.type !== typeFilter) return false
      if (statusFilter !== 'all' && account.status !== statusFilter) {
        return false
      }
      if (!term) return true
      return (
        account.id.toLowerCase().includes(term) ||
        account.name.toLowerCase().includes(term) ||
        (account.picName?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [search, typeFilter, statusFilter])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Contract Management
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Accounts
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the account catalogue — corporates, branches and aggregators
            with their billing and PIC contacts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => navigate({ to: '/add-account' })}>
            <UserRoundPlus className="h-4 w-4" strokeWidth={1.75} />
            Add Account
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search ID, name or PIC…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ACCOUNT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | AccountStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ACCOUNT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Account table */}
      <AccountsTable
        rows={pageRows}
        total={filtered.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
      />
    </div>
  )
}
