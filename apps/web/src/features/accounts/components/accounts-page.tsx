import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  ContractListModal,
  contractLinesListQueryOptions,
} from '#/features/contract-lines/index.ts'
import { useCreateAccount } from '../api/create-account.ts'
import type { AccountPayload } from '../api/create-account.ts'
import { useDeleteAccount } from '../api/delete-account.ts'
import {
  accountsListQueryOptions,
  isDuplicateAccountIdError,
} from '../api/list-accounts.ts'
import { useSetAccountStatus, useUpdateAccount } from '../api/update-account.ts'
import {
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

/** Maps the dialog's string fields onto the API payload shape. */
function payloadFromForm(values: AccountFormValues): AccountPayload {
  return {
    accountId: values.accountId,
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
 * Contract Management → Account. Search, type/status filters and pagination
 * all run server-side (GET /accounts), and every CRUD action goes through
 * the backend API; the mutation hooks own toasts and cache invalidation, so
 * the table refreshes after every write.
 */
export function AccountsPage() {
  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | AccountType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  // ── Pagination (server-side) ───────────────────────────────────────────
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
  }, [debouncedSearch, typeFilter, statusFilter])

  const listQuery = useQuery(
    accountsListQueryOptions({
      search: debouncedSearch,
      type: typeFilter,
      status: statusFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const accounts = listQuery.data?.accounts ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AccountRecord | null>(null)
  // Bumped on every duplicate-id 409 so the form modal highlights the
  // Account ID field without losing the entered values.
  const [duplicateConflict, setDuplicateConflict] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<AccountRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<AccountRecord | null>(null)
  const [contractsOpen, setContractsOpen] = useState(false)
  const [viewingContracts, setViewingContracts] =
    useState<AccountRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDuplicateConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: AccountRecord) => {
    setEditing(record)
    setDuplicateConflict(0)
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

  const openViewContracts = (record: AccountRecord) => {
    setViewingContracts(record)
    setContractsOpen(true)
  }

  // The modal lists the actual contract line documents of one account,
  // fetched on demand from GET /contract-lines with the accountId filter —
  // only while the modal is open, so table renders stay cheap. Placeholder
  // data is disabled so a different account never flashes stale rows.
  const contractsQuery = useQuery({
    ...contractLinesListQueryOptions({
      accountId: viewingContracts?.id ?? '',
      pageSize: 100,
    }),
    placeholderData: undefined,
    enabled: contractsOpen && viewingContracts !== null,
  })

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const setAccountStatus = useSetAccountStatus()

  const saving = createAccount.isPending || updateAccount.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload keeps the user's input intact. A duplicate-id 409
  // additionally highlights the Account ID field inline.
  const handleSubmit = (values: AccountFormValues) => {
    const payload = payloadFromForm(values)
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateAccountIdError(error)) {
          setDuplicateConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateAccount.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createAccount.mutate(payload, callbacks)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteAccount.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setAccountStatus.mutate({
      id: toggling.id,
      status: toggling.status === 'active' ? 'inactive' : 'active',
    })
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
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as 'all' | AccountType)}
        >
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
        rows={accounts}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load accounts.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEdit={openEdit}
        onStatusToggle={openStatusToggle}
        onDelete={openDelete}
        onViewContracts={openViewContracts}
      />

      <AccountFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        saving={saving}
        duplicateConflict={duplicateConflict}
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
      <ContractListModal
        isOpen={contractsOpen}
        onClose={() => setContractsOpen(false)}
        contracts={contractsQuery.data?.contractLines ?? []}
        title={viewingContracts?.name}
        loading={contractsQuery.isLoading}
      />
    </div>
  )
}
