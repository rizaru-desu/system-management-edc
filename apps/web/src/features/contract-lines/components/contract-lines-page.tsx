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
import {
  CONTRACT_LINES,
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

/**
 * Contract Management → Contract Lines. The index/list view over the
 * contract line catalogue: search, status/document status filters and
 * pagination run client-side, and add/edit/delete/status changes go through
 * the same modal + confirmation dialogs as the other modules — all against
 * the local placeholder list until the backend endpoint lands. The
 * account/project selects are fed by the live catalogues (GET /accounts and
 * GET /projects), never hardcoded.
 */
export function ContractLinesPage() {
  // The catalogue lives in state so the form modal and the confirmation
  // dialogs mutate it in place (in memory only, until the API exists).
  const [contractLines, setContractLines] =
    useState<Array<ContractLineRecord>>(CONTRACT_LINES)

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

  // ── Search & filters (client-side over the local list) ─────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContractLineStatus>(
    'all',
  )
  const [documentStatusFilter, setDocumentStatusFilter] = useState<
    'all' | DocumentStatus
  >('all')

  const isFiltering =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    documentStatusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setDocumentStatusFilter('all')
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
  }, [search, statusFilter, documentStatusFilter])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return contractLines.filter((line) => {
      if (statusFilter !== 'all' && line.status !== statusFilter) return false
      if (
        documentStatusFilter !== 'all' &&
        line.documentStatus !== documentStatusFilter
      ) {
        return false
      }
      if (!term) return true
      return (
        line.id.toLowerCase().includes(term) ||
        line.name.toLowerCase().includes(term)
      )
    })
  }, [contractLines, search, statusFilter, documentStatusFilter])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContractLineRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ContractLineRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<ContractLineRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: ContractLineRecord) => {
    setEditing(record)
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

  // ── CRUD (in-memory list updates) ──────────────────────────────────────
  /** Maps the dialog's fields onto the record shape, resolving labels. */
  const recordFromForm = (
    values: ContractLineFormValues,
  ): ContractLineRecord => {
    const accountLabel =
      accountOptions.find((option) => option.value === values.accountId)
        ?.label ??
      (editing?.accountId === values.accountId ? editing.accountLabel : '')
    const projectLabel =
      projectOptions.find((option) => option.value === values.projectId)
        ?.label ??
      (editing?.projectId === values.projectId ? editing.projectLabel : '')
    return {
      id: values.lineNumber,
      name: values.lineName,
      accountId: values.accountId,
      accountLabel,
      projectId: values.projectId,
      projectLabel,
      vendorEdc: blankOrNull(values.vendorEdc),
      serviceItem: blankOrNull(values.serviceItem),
      startDate: values.startDate,
      endDate: values.endDate,
      notes: blankOrNull(values.notes),
      status: values.status,
      documentStatus: values.documentStatus,
    }
  }

  const handleSubmit = (values: ContractLineFormValues) => {
    const record = recordFromForm(values)
    setContractLines((previous) =>
      editing
        ? previous.map((line) => (line.id === editing.id ? record : line))
        : [...previous, record],
    )
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    setContractLines((previous) =>
      previous.filter((line) => line.id !== deleting.id),
    )
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setContractLines((previous) =>
      previous.map((line) =>
        line.id === toggling.id
          ? {
              ...line,
              status: line.status === 'active' ? 'inactive' : 'active',
            }
          : line,
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

      <ContractLineFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        contractLine={editing}
        accountOptions={accountOptions}
        projectOptions={projectOptions}
        existingNumbers={contractLines.map((line) => line.id)}
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
