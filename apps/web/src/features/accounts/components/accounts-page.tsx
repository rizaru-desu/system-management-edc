import { useEffect, useMemo, useState } from 'react'
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
import type {
  AccountRecord,
  AccountStatus,
  AccountType,
} from '../data/accounts.ts'
import { AccountFormModal } from './account-form-modal.tsx'
import type { AccountFormValues } from './account-form-modal.tsx'
import { AccountsTable } from './accounts-table.tsx'
import { DeleteAccountDialog } from './delete-account-dialog.tsx'
import { ToggleAccountStatusDialog } from './toggle-account-status-dialog.tsx'

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto the account record shape. */
function recordFromForm(values: AccountFormValues): AccountRecord {
  return {
    id: values.accountId,
    name: values.accountName,
    // The form validates the type against the catalogue before submitting.
    type: values.accountType as AccountType,
    status: values.status,
    billingName: blankOrNull(values.billingName),
    taxId: blankOrNull(values.taxId),
    billingAddress: blankOrNull(values.billingAddress),
    city: blankOrNull(values.city),
    region: blankOrNull(values.region),
    picName: blankOrNull(values.picName),
    picPhone: blankOrNull(values.picPhone),
    picEmail: blankOrNull(values.picEmail),
  }
}

/**
 * Contract Management → Account. The index/list view over the account
 * catalogue: search, type/status filters and pagination run client-side, and
 * add/edit/delete/status changes go through the same modal + confirmation
 * dialogs as the other modules — all against the local placeholder list
 * until the backend endpoint lands.
 */
export function AccountsPage() {
  // The catalogue lives in state so the form modal and the confirmation
  // dialogs mutate it in place (in memory only, until the API exists).
  const [accounts, setAccounts] = useState<Array<AccountRecord>>(ACCOUNTS)

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
    return accounts.filter((account) => {
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
  }, [accounts, search, typeFilter, statusFilter])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AccountRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<AccountRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<AccountRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: AccountRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openDelete = (record: AccountRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const openStatusToggle = (record: AccountRecord) => {
    setToggling(record)
    setStatusOpen(true)
  }

  // ── CRUD (in-memory list updates) ──────────────────────────────────────
  const handleSubmit = (values: AccountFormValues) => {
    const record = recordFromForm(values)
    setAccounts((previous) =>
      editing
        ? previous.map((account) =>
            account.id === editing.id ? record : account,
          )
        : [...previous, record],
    )
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    setAccounts((previous) =>
      previous.filter((account) => account.id !== deleting.id),
    )
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setAccounts((previous) =>
      previous.map((account) =>
        account.id === toggling.id
          ? {
              ...account,
              status: account.status === 'active' ? 'inactive' : 'active',
            }
          : account,
      ),
    )
    setToggling(null)
  }

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
          <Button onClick={openCreate}>
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
        onEdit={openEdit}
        onStatusToggle={openStatusToggle}
        onDelete={openDelete}
      />

      <AccountFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        existingIds={accounts.map((account) => account.id)}
        onSubmit={handleSubmit}
      />
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        account={deleting}
        onConfirm={handleDelete}
      />
      <ToggleAccountStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        account={toggling}
        onConfirm={handleStatusToggle}
      />
    </div>
  )
}
