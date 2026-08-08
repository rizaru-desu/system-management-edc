import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePlus2 } from 'lucide-react'
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
import { accountsListQueryOptions } from '#/features/accounts/index.ts'
import { projectsListQueryOptions } from '#/features/projects/index.ts'
import { useCreateContractLine } from '../api/create-contract-line.ts'
import type { ContractLinePayload } from '../api/create-contract-line.ts'
import { useDeleteContractLine } from '../api/delete-contract-line.ts'
import {
  contractLinesListQueryOptions,
  isDuplicateLineNumberError,
} from '../api/list-contract-lines.ts'
import {
  useSetContractLineStatus,
  useUpdateContractLine,
} from '../api/update-contract-line.ts'
import {
  CONTRACT_LINE_STATUS_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
} from '../data/contract-lines.ts'
import type {
  ContractLineRecord,
  ContractLineStatus,
  DocumentStatus,
} from '../data/contract-lines.ts'
import { ContractLineFormModal } from './contract-line-form-modal.tsx'
import type {
  ContractLineFormValues,
  RelationOption,
} from './contract-line-form-modal.tsx'
import { ContractLinesTable } from './contract-lines-table.tsx'
import { DeleteContractLineDialog } from './delete-contract-line-dialog.tsx'
import { ToggleContractLineStatusDialog } from './toggle-contract-line-status-dialog.tsx'

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto the API payload shape. */
function payloadFromForm(values: ContractLineFormValues): ContractLinePayload {
  return {
    lineNumber: values.lineNumber,
    name: values.lineName,
    status: values.status,
    documentStatus: values.documentStatus,
    vendorEdc: blankOrNull(values.vendorEdc),
    accountId: values.accountId,
    projectId: values.projectId,
    serviceItem: blankOrNull(values.serviceItem),
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    notes: blankOrNull(values.notes),
  }
}

/**
 * Contract Management → Contract Lines. Search, status/document status
 * filters and pagination all run server-side (GET /contract-lines, with the
 * owning account and project joined into every row), and every CRUD action
 * goes through the backend API; the mutation hooks own toasts and cache
 * invalidation, so the table refreshes after every write. The
 * account/project selects are fed by the live catalogues (GET /accounts and
 * GET /projects), never hardcoded.
 */
export function ContractLinesPage() {
  // ── Relational options (live catalogues from the backend) ──────────────
  const accountsQuery = useQuery(accountsListQueryOptions({ pageSize: 100 }))
  const projectsQuery = useQuery(projectsListQueryOptions({ pageSize: 100 }))

  // Searchable choices in the shared "[CODE] Name" display format — the
  // label carries both, so one label search matches code and name.
  const accountOptions = useMemo<Array<RelationOption>>(
    () =>
      (accountsQuery.data?.accounts ?? []).map((account) => ({
        value: account.id,
        label: `[${account.accountId}] ${account.name}`,
      })),
    [accountsQuery.data],
  )

  const projectOptions = useMemo<Array<RelationOption>>(
    () =>
      (projectsQuery.data?.projects ?? []).map((project) => ({
        value: project.id,
        label: `[${project.code}] ${project.name}`,
      })),
    [projectsQuery.data],
  )

  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContractLineStatus>(
    'all',
  )
  const [documentStatusFilter, setDocumentStatusFilter] = useState<
    'all' | DocumentStatus
  >('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    statusFilter !== 'all' ||
    documentStatusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setDocumentStatusFilter('all')
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
  }, [debouncedSearch, statusFilter, documentStatusFilter])

  const listQuery = useQuery(
    contractLinesListQueryOptions({
      search: debouncedSearch,
      status: statusFilter,
      documentStatus: documentStatusFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const contractLines = listQuery.data?.contractLines ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContractLineRecord | null>(null)
  // Bumped on every duplicate-number 409 so the form modal highlights the
  // line number field without losing the entered values.
  const [duplicateConflict, setDuplicateConflict] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ContractLineRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<ContractLineRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDuplicateConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: ContractLineRecord) => {
    setEditing(record)
    setDuplicateConflict(0)
    setFormOpen(true)
  }

  const openDelete = (record: ContractLineRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const openStatusToggle = (record: ContractLineRecord) => {
    setToggling(record)
    setStatusOpen(true)
  }

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createContractLine = useCreateContractLine()
  const updateContractLine = useUpdateContractLine()
  const deleteContractLine = useDeleteContractLine()
  const setContractLineStatus = useSetContractLineStatus()

  const saving = createContractLine.isPending || updateContractLine.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload keeps the user's input intact. A duplicate-number
  // 409 additionally highlights the line number field inline.
  const handleSubmit = (values: ContractLineFormValues) => {
    const payload = payloadFromForm(values)
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateLineNumberError(error)) {
          setDuplicateConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateContractLine.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createContractLine.mutate(payload, callbacks)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteContractLine.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setContractLineStatus.mutate({
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
            Contract Lines
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the contract line catalogue — the agreements binding accounts
            and projects to EDC service work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate}>
            <FilePlus2 className="h-4 w-4" strokeWidth={1.75} />
            Add Contract Line
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search line number or name…"
          containerClassName="min-w-[240px] sm:max-w-xs"
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | ContractLineStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CONTRACT_LINE_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={documentStatusFilter}
          onValueChange={(value) =>
            setDocumentStatusFilter(value as 'all' | DocumentStatus)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by document status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All document statuses</SelectItem>
            {DOCUMENT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contract line table */}
      <ContractLinesTable
        rows={contractLines}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load contract lines.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEdit={openEdit}
        onStatusToggle={openStatusToggle}
        onDelete={openDelete}
      />

      <ContractLineFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        contractLine={editing}
        accountOptions={accountOptions}
        projectOptions={projectOptions}
        saving={saving}
        duplicateConflict={duplicateConflict}
        onSubmit={handleSubmit}
      />
      <DeleteContractLineDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        contractLine={deleting}
        onConfirm={handleDelete}
      />
      <ToggleContractLineStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        contractLine={toggling}
        onConfirm={handleStatusToggle}
      />
    </div>
  )
}
