import { useEffect, useMemo, useState } from 'react'
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
import { PROJECT_STATUS_OPTIONS, PROJECTS } from '../data/projects.ts'
import type { ProjectRecord, ProjectStatus } from '../data/projects.ts'
import { DeleteProjectDialog } from './delete-project-dialog.tsx'
import { ProjectFormModal } from './project-form-modal.tsx'
import type { ProjectFormValues } from './project-form-modal.tsx'
import { ProjectsTable } from './projects-table.tsx'
import { ToggleProjectStatusDialog } from './toggle-project-status-dialog.tsx'

const blankOrNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps the dialog's string fields onto the project record shape. */
function recordFromForm(values: ProjectFormValues): ProjectRecord {
  return {
    id: values.code,
    name: values.name,
    description: blankOrNull(values.description),
    status: values.status,
  }
}

/**
 * Contract Management → Projects. The index/list view over the project
 * catalogue: search, status filter and pagination run client-side, and
 * add/edit/delete/status changes go through the same modal + confirmation
 * dialogs as the other modules — all against the local placeholder list
 * until the backend endpoint lands.
 */
export function ProjectsPage() {
  // The catalogue lives in state so the form modal and the confirmation
  // dialogs mutate it in place (in memory only, until the API exists).
  const [projects, setProjects] = useState<Array<ProjectRecord>>(PROJECTS)

  // ── Search & filter (client-side over the local list) ──────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')

  const isFiltering = search.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  // ── Pagination (client-side) ───────────────────────────────────────────
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
  }, [search, statusFilter])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false
      }
      if (!term) return true
      return (
        project.id.toLowerCase().includes(term) ||
        project.name.toLowerCase().includes(term)
      )
    })
  }, [projects, search, statusFilter])

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }, [filtered, pagination])

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<ProjectRecord | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toggling, setToggling] = useState<ProjectRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: ProjectRecord) => {
    setEditing(record)
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

  // ── CRUD (in-memory list updates) ──────────────────────────────────────
  const handleSubmit = (values: ProjectFormValues) => {
    const record = recordFromForm(values)
    setProjects((previous) =>
      editing
        ? previous.map((project) =>
            project.id === editing.id ? record : project,
          )
        : [...previous, record],
    )
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    setProjects((previous) =>
      previous.filter((project) => project.id !== deleting.id),
    )
    setDeleting(null)
  }

  const handleStatusToggle = () => {
    if (!toggling) return
    setProjects((previous) =>
      previous.map((project) =>
        project.id === toggling.id
          ? {
              ...project,
              status: project.status === 'active' ? 'inactive' : 'active',
            }
          : project,
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

      <ProjectFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        existingCodes={projects.map((project) => project.id)}
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
    </div>
  )
}
