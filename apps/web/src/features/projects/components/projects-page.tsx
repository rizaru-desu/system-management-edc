import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderPlus } from 'lucide-react'
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
import { useCreateProject } from '../api/create-project.ts'
import type { ProjectPayload } from '../api/create-project.ts'
import { useDeleteProject } from '../api/delete-project.ts'
import {
  isDuplicateCodeError,
  projectsListQueryOptions,
} from '../api/list-projects.ts'
import { useSetProjectStatus, useUpdateProject } from '../api/update-project.ts'
import { PROJECT_STATUS_OPTIONS } from '../data/projects.ts'
import type { ProjectRecord, ProjectStatus } from '../data/projects.ts'
import { DeleteProjectDialog } from './delete-project-dialog.tsx'
import { ProjectFormModal } from './project-form-modal.tsx'
import type { ProjectFormValues } from './project-form-modal.tsx'
import { ProjectsTable } from './projects-table.tsx'
import { ToggleProjectStatusDialog } from './toggle-project-status-dialog.tsx'

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto the API payload shape. */
function payloadFromForm(values: ProjectFormValues): ProjectPayload {
  return {
    code: values.code,
    name: values.name,
    description: blankOrNull(values.description),
    status: values.status,
  }
}

/**
 * Contract Management → Projects. Search, status filter and pagination all
 * run server-side (GET /projects), and every CRUD action goes through the
 * backend API; the mutation hooks own toasts and cache invalidation, so the
 * table refreshes after every write.
 */
export function ProjectsPage() {
  // ── Search & filter (server-side) ──────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering = debouncedSearch.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
  }

  // ── Pagination (server-side) ───────────────────────────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing the search term or the filter changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, statusFilter])

  const listQuery = useQuery(
    projectsListQueryOptions({
      search: debouncedSearch,
      status: statusFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const projects = listQuery.data?.projects ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRecord | null>(null)
  // Bumped on every duplicate-code 409 so the form modal highlights the
  // code field without losing the entered values.
  const [duplicateConflict, setDuplicateConflict] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ProjectRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<ProjectRecord | null>(null)
  const [contractsOpen, setContractsOpen] = useState(false)
  const [viewingContracts, setViewingContracts] =
    useState<ProjectRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDuplicateConflict(0)
    setFormOpen(true)
  }

  const openEdit = (record: ProjectRecord) => {
    setEditing(record)
    setDuplicateConflict(0)
    setFormOpen(true)
  }

  const openDelete = (record: ProjectRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const openStatusToggle = (record: ProjectRecord) => {
    setToggling(record)
    setStatusOpen(true)
  }

  const openViewContracts = (record: ProjectRecord) => {
    setViewingContracts(record)
    setContractsOpen(true)
  }

  // The modal lists the actual contract line documents of one project,
  // fetched on demand from GET /contract-lines with the projectId filter —
  // only while the modal is open, so table renders stay cheap. Placeholder
  // data is disabled so a different project never flashes stale rows.
  const contractsQuery = useQuery({
    ...contractLinesListQueryOptions({
      projectId: viewingContracts?.id ?? '',
      pageSize: 100,
    }),
    placeholderData: undefined,
    enabled: contractsOpen && viewingContracts !== null,
  })

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const setProjectStatus = useSetProjectStatus()

  const saving = createProject.isPending || updateProject.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload keeps the user's input intact. A duplicate-code 409
  // additionally highlights the code field inline.
  const handleSubmit = (values: ProjectFormValues) => {
    const payload = payloadFromForm(values)
    const callbacks = {
      onSuccess: () => setFormOpen(false),
      onError: (error: unknown) => {
        if (isDuplicateCodeError(error)) {
          setDuplicateConflict((previous) => previous + 1)
        }
      },
    }
    if (editing) {
      updateProject.mutate({ id: editing.id, ...payload }, callbacks)
      return
    }
    createProject.mutate(payload, callbacks)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteProject.mutate({ id: deleting.id, name: deleting.name })
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setProjectStatus.mutate({
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
            Projects
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the project catalogue — the initiatives that group contract
            and deployment work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate}>
            <FolderPlus className="h-4 w-4" strokeWidth={1.75} />
            Add Project
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search code or name…"
          containerClassName="min-w-[240px] sm:max-w-xs"
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | ProjectStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project table */}
      <ProjectsTable
        rows={projects}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load projects.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEdit={openEdit}
        onStatusToggle={openStatusToggle}
        onDelete={openDelete}
        onViewContracts={openViewContracts}
      />

      <ProjectFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        saving={saving}
        duplicateConflict={duplicateConflict}
        onSubmit={handleSubmit}
      />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        project={deleting}
        onConfirm={handleDelete}
      />
      <ToggleProjectStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        project={toggling}
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
