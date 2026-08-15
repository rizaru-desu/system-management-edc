import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import {
  availableEngineerUsersQueryOptions,
  engineerWarehouseOptionsQueryOptions,
  fieldEngineersListQueryOptions,
  useCreateEngineerProfile,
  useRemoveEngineerProfile,
  useUpdateEngineerProfile,
} from '../api/field-engineers.ts'
import type { FieldEngineerRecord } from '../data/field-engineers.ts'
import { FieldEngineerProfileModal } from './field-engineer-profile-modal.tsx'
import type { FieldEngineerProfileFormValues } from './field-engineer-profile-modal.tsx'
import { FieldEngineersTable } from './field-engineers-table.tsx'
import { RemoveProfileDialog } from './remove-profile-dialog.tsx'

/** Profile-status filter choices (mapped onto the server's filter). */
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
 * onboarded with a work profile. Search, filters and pagination all run
 * server-side; the mutation hooks own toasts and cache invalidation.
 */
export function FieldEngineersPage() {
  // ── Search & filters (server-side; search debounced) ───────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Changing the search term or filters changes the row set, so any page
  // beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, warehouseFilter, profileFilter])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    warehouseFilter !== 'all' ||
    profileFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setWarehouseFilter('all')
    setProfileFilter('all')
  }

  const listQuery = useQuery(
    fieldEngineersListQueryOptions({
      search: debouncedSearch,
      warehouseId: warehouseFilter,
      profileStatus: profileFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const engineers = listQuery.data?.engineers ?? []
  const total = listQuery.data?.total ?? 0

  // Active warehouses feed both the filter and the form dropdown.
  const warehousesQuery = useQuery(engineerWarehouseOptionsQueryOptions())
  const warehouseOptions = warehousesQuery.data ?? []

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FieldEngineerRecord | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState<FieldEngineerRecord | null>(null)

  // Only fetched while the create flow can actually show the picker.
  const availableUsersQuery = useQuery({
    ...availableEngineerUsersQueryOptions(),
    enabled: formOpen && editing === null,
  })

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

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createProfile = useCreateEngineerProfile()
  const updateProfile = useUpdateEngineerProfile()
  const removeProfile = useRemoveEngineerProfile()

  const saving = createProfile.isPending || updateProfile.isPending

  const handleSubmit = (values: FieldEngineerProfileFormValues) => {
    const callbacks = { onSuccess: () => setFormOpen(false) }
    // Editing an engineer that already has a profile updates it; picking
    // a user without one (create flow or "Complete profile") creates it.
    if (editing?.profile) {
      updateProfile.mutate(values, callbacks)
      return
    }
    createProfile.mutate(values, callbacks)
  }

  const handleRemove = () => {
    if (!removing) return
    removeProfile.mutate(
      { userId: removing.userId },
      {
        onSuccess: () => setRemoveOpen(false),
        onError: () => setRemoveOpen(false),
      },
    )
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
          isFetching={listQuery.isFetching && !listQuery.isPending}
        />
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouseOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
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

      {/* Table */}
      <FieldEngineersTable
        rows={engineers}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load the field engineers.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onEditProfile={openEdit}
        onRemoveProfile={openRemove}
      />

      <FieldEngineerProfileModal
        open={formOpen}
        onOpenChange={setFormOpen}
        engineer={editing}
        availableUsers={availableUsersQuery.data ?? []}
        availableUsersPending={availableUsersQuery.isPending}
        availableUsersError={availableUsersQuery.isError}
        onRetryAvailableUsers={() => availableUsersQuery.refetch()}
        warehouseOptions={warehouseOptions}
        warehouseOptionsPending={warehousesQuery.isPending}
        saving={saving}
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
