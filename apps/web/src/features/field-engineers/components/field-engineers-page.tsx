import { useState } from 'react'
import { UserPlus } from 'lucide-react'
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
import type { FieldEngineerRecord } from '../data/field-engineers.ts'
import { FieldEngineerProfileModal } from './field-engineer-profile-modal.tsx'
import type { FieldEngineerProfileFormValues } from './field-engineer-profile-modal.tsx'
import { FieldEngineersTable } from './field-engineers-table.tsx'
import { RemoveProfileDialog } from './remove-profile-dialog.tsx'

/** Profile-status filter choices (server-side once wired). */
const PROFILE_FILTERS = [
  { key: 'all', label: 'All profiles' },
  { key: 'complete', label: 'Profile Complete' },
  { key: 'needs-setup', label: 'Needs Setup' },
] as const

type ProfileFilter = (typeof PROFILE_FILTERS)[number]['key']

/**
 * Service Operations → Field Engineers: Users holding the Field Service
 * Engineer role, joined with their work profile (warehouse, coverage
 * region, specializations, duty status). This module never creates
 * people — accounts and roles live in Users & Roles; here they only get
 * onboarded with a work profile.
 *
 * Phase 1: structure only — search/filters are not wired and the table
 * renders the real empty state until the API integration phase.
 */
export function FieldEngineersPage() {
  // ── Search & filters (UI only until the API phase) ─────────────────────
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const isFiltering =
    search.trim() !== '' || warehouseFilter !== 'all' || profileFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setWarehouseFilter('all')
    setProfileFilter('all')
  }

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FieldEngineerRecord | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState<FieldEngineerRecord | null>(null)

  const openComplete = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: FieldEngineerRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openRemove = (record: FieldEngineerRecord) => {
    setRemoving(record)
    setRemoveOpen(true)
  }

  // Wired to the backend in the API integration phase.
  const handleSubmit = (_values: FieldEngineerProfileFormValues) => {
    setFormOpen(false)
  }

  const handleRemove = () => {
    setRemoveOpen(false)
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Service Operations
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Field Engineers
          </h1>
          <p className="text-sm text-brand-900/60">
            Users holding the Field Service Engineer role, with their work
            profile — warehouse, coverage region and specializations. Accounts
            and roles themselves are managed in Users &amp; Roles.
          </p>
        </div>
        <Button onClick={openComplete}>
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          Complete Profile
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search engineer…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={profileFilter}
          onValueChange={(value) => setProfileFilter(value as ProfileFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by profile" />
          </SelectTrigger>
          <SelectContent>
            {PROFILE_FILTERS.map((filter) => (
              <SelectItem key={filter.key} value={filter.key}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table — empty until the API integration phase. */}
      <FieldEngineersTable
        rows={[]}
        total={0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={false}
        isError={false}
        errorMessage="Failed to load the field engineers."
        onRetry={() => {}}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEditProfile={openEdit}
        onRemoveProfile={openRemove}
      />

      <FieldEngineerProfileModal
        open={formOpen}
        onOpenChange={setFormOpen}
        engineer={editing}
        availableUsers={[]}
        availableUsersPending={false}
        availableUsersError={false}
        onRetryAvailableUsers={() => {}}
        warehouseOptions={[]}
        warehouseOptionsPending={false}
        saving={false}
        onSubmit={handleSubmit}
      />

      <RemoveProfileDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        engineer={removing}
        onConfirm={handleRemove}
      />
    </div>
  )
}
