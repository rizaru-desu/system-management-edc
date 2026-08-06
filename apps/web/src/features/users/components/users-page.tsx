import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PaginationState } from '@tanstack/react-table'

import { Button } from '#/components/ui/button.tsx'
import { SummarySparkline } from '#/components/dashboard/SummarySparkline.tsx'
import { Card } from '#/components/ui/card.tsx'
import { Progress } from '#/components/ui/progress.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { ROLES } from '#/features/console/index.ts'
import type { RoleKey } from '#/features/console/index.ts'
import { cn } from '#/lib/utils.ts'
import { useCreateUser } from '../api/create-user.ts'
import { usersQueryOptions } from '../api/list-users.ts'
import {
  rolePermissionsQueryOptions,
  useSaveRolePermissions,
} from '../api/role-permissions.ts'
import { useUpdateUser } from '../api/update-user.ts'
import { userStatsQueryOptions } from '../api/user-stats.ts'
import { seedRolePermissions } from '../data/permissions.ts'
import { seedAssignmentsForUser } from '../data/service-point-assignments.ts'
import type { ServicePointAssignment } from '../data/service-point-assignments.ts'
import type { UserRecord } from '../data/users.ts'
import { AssignServicePointsDrawer } from './assign-service-points-drawer.tsx'
import { PermissionsModal } from './permissions-modal.tsx'
import { RolePermissionsModal } from './role-permissions-modal.tsx'
import { UserDeviceDrawer } from './user-device-drawer.tsx'
import { UserFormModal } from './user-form-modal.tsx'
import type { UserFormValues } from './user-form-modal.tsx'
import { UsersTable } from './users-table.tsx'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | RoleKey>('all')
  // Debounced copy of `search` so the backend is queried while typing (live
  // search) without firing a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Search, role filter AND pagination all happen server-side (QUERY /users
  // returns one page plus the filtered total); edits persist via
  // PATCH /users/:id and creates via POST /users.
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Changing the search term or role filter changes the result set, so any
  // page beyond the first may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, roleFilter])

  const usersQuery = useQuery(
    usersQueryOptions({
      search: debouncedSearch,
      role: roleFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const users = usersQuery.data?.users ?? []
  const totalRows = usersQuery.data?.total ?? 0

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissionsUser, setPermissionsUser] = useState<UserRecord | null>(
    null,
  )
  const [rolePermsOpen, setRolePermsOpen] = useState(false)

  // Device management drawer
  const [devicesDrawerOpen, setDevicesDrawerOpen] = useState(false)
  const [devicesUser, setDevicesUser] = useState<UserRecord | null>(null)

  // Service point assignment drawer (UI only). Saved drafts live in this
  // session-local map; users without an entry fall back to the deterministic
  // mock seed, so the table column always has a count to show. The future
  // Assignment API replaces both.
  const [assignmentOverrides, setAssignmentOverrides] = useState<
    Record<string, Array<ServicePointAssignment>>
  >({})
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false)
  const [assignUser, setAssignUser] = useState<UserRecord | null>(null)

  const assignmentsFor = useCallback(
    (user: UserRecord) =>
      assignmentOverrides[user.id] ?? seedAssignmentsForUser(user),
    [assignmentOverrides],
  )

  // Memoized so the drawer's draft-reseeding effect only fires on real
  // changes, not on every page render.
  const assignUserAssignments = useMemo(
    () => (assignUser ? assignmentsFor(assignUser) : []),
    [assignUser, assignmentsFor],
  )

  const openAssignDrawer = (user: UserRecord) => {
    setAssignUser(user)
    setAssignDrawerOpen(true)
  }

  const handleSaveAssignments = (
    user: UserRecord,
    assignments: Array<ServicePointAssignment>,
  ) => {
    setAssignmentOverrides((previous) => ({
      ...previous,
      [user.id]: assignments,
    }))
    toast.success(`Service point assignments for “${user.name}” updated.`, {
      description: 'Mock data — changes reset on reload.',
    })
  }

  // V/C/U/D matrix from GET /permissions (seed defaults until it resolves);
  // saving goes through PUT /permissions with an optimistic cache update.
  const seedMatrix = useMemo(seedRolePermissions, [])
  const rolePermsQuery = useQuery(rolePermissionsQueryOptions())
  const saveRolePerms = useSaveRolePermissions()
  const rolePerms = rolePermsQuery.data ?? seedMatrix

  // Whole-table counts from GET /users/stats: the cards keep showing global
  // totals no matter what search/role filter the table is using.
  const statsQuery = useQuery(userStatsQueryOptions())
  const stats = statsQuery.data ?? { total: 0, active: 0, admins: 0 }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (user: UserRecord) => {
    setEditing(user)
    setFormOpen(true)
  }

  const openPermissions = (user: UserRecord) => {
    setPermissionsUser(user)
    setPermissionsOpen(true)
  }

  const openDevicesDrawer = (user: UserRecord) => {
    setDevicesUser(user)
    setDevicesDrawerOpen(true)
  }

  const updateUser = useUpdateUser()
  const createUser = useCreateUser()

  const handleSubmit = (values: UserFormValues) => {
    // The form's reason is a plain string; the record stores null when the
    // account is active or no reason was given.
    const banReason =
      values.status === 'inactive' ? values.banReason.trim() || null : null
    if (editing) {
      // The mutation swaps the row optimistically in the query cache; its
      // settle-time invalidate refetches the stored truth (and reverts the
      // swap if the save failed).
      updateUser.mutate({
        id: editing.id,
        name: values.name,
        email: values.email,
        roles: values.roles,
        status: values.status,
        banReason,
      })
      return
    }
    createUser.mutate({
      name: values.name,
      email: values.email,
      roles: values.roles,
      password: values.password,
      status: values.status,
      banReason,
    })
  }

  const shareOfTotal = (value: number) =>
    stats.total > 0 ? Math.round((value / stats.total) * 100) : 0

  // Decorative series for the Active Users sparkline — a real one needs a
  // stats-history endpoint; until then this stands in as pure ornament.
  const activeSpark = [4, 6, 5, 7, 6.5, 8, 7.5]

  const statCards = [
    {
      icon: Users,
      label: 'Total users',
      value: stats.total,
      caption: 'Registered console accounts',
      accent: 'text-primary',
      chip: 'bg-primary/10 text-primary',
      meter: null,
      spark: null,
      trend: null,
    },
    {
      icon: UserCheck,
      label: 'Active users',
      value: stats.active,
      caption: `${shareOfTotal(stats.active)}% of all users`,
      // Emerald = status ("enabled"), same ramp as the table's Active pill.
      accent: 'text-emerald-600',
      chip: 'bg-emerald-500/10 text-emerald-600',
      meter: null,
      spark: activeSpark,
      // Share-of-total stands in for the 7-day delta until history data exists.
      trend: shareOfTotal(stats.active),
    },
    {
      icon: ShieldCheck,
      label: 'System admins',
      value: stats.admins,
      caption: `${shareOfTotal(stats.admins)}% of all users`,
      accent: 'text-primary',
      chip: 'bg-primary/10 text-primary',
      meter: {
        percent: shareOfTotal(stats.admins),
        fill: 'bg-primary',
        track: 'bg-primary/15',
      },
      spark: null,
      trend: null,
    },
  ]

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Administration
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Users &amp; Roles
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage console accounts, role assignment and module access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRolePermsOpen(true)}>
            <KeyRound className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Role permissions
          </Button>
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Add user
          </Button>
        </div>
      </div>

      {/* Stats — whole-table counts, unaffected by search/filter */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {statsQuery.isPending
          ? statCards.map((card) => (
              <Card
                key={card.label}
                className="flex min-h-[180px] flex-col justify-between rounded-xl border-border bg-card p-6 text-card-foreground shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
                <Skeleton className="h-3 w-28" />
              </Card>
            ))
          : statCards.map((card) => (
              <Card
                key={card.label}
                className="flex min-h-[180px] flex-col justify-between gap-4 rounded-xl border-border bg-card p-6 text-card-foreground shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-[11px] font-semibold uppercase tracking-[0.14em]',
                        card.accent,
                      )}
                    >
                      {card.label}
                    </p>
                    <p className="font-display mt-2 text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">
                      {statsQuery.isError ? '—' : card.value.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {card.caption}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      card.chip,
                    )}
                  >
                    <card.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                </div>
                <div>
                  {card.spark ? (
                    <SummarySparkline
                      data={card.spark}
                      className="text-emerald-500"
                    />
                  ) : card.meter ? (
                    <Progress
                      value={card.meter.percent}
                      aria-label={`${card.label} as a share of all users`}
                      className={cn('h-1.5', card.meter.track)}
                      indicatorClassName={card.meter.fill}
                    />
                  ) : (
                    <div className="border-t border-border" aria-hidden="true" />
                  )}
                  {/* Trend deltas need a stats-history endpoint; the em dash is
                    the honest placeholder until one exists. */}
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    {card.trend !== null ? (
                      <>
                        <span className="font-semibold text-emerald-600">
                          ↑ {card.trend}%
                        </span>{' '}
                        vs last 7 days
                      </>
                    ) : (
                      '— vs last 7 days'
                    )}
                  </p>
                </div>
              </Card>
            ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email…"
          isFetching={usersQuery.isFetching && !usersQuery.isPending}
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as 'all' | RoleKey)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role.key} value={role.key}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <UsersTable
        users={users}
        total={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={usersQuery.isPending}
        isError={usersQuery.isError}
        isSuccess={usersQuery.isSuccess}
        errorMessage={
          usersQuery.error instanceof Error
            ? usersQuery.error.message
            : 'Failed to load users.'
        }
        onRetry={() => usersQuery.refetch()}
        onViewPermissions={openPermissions}
        onEdit={openEdit}
        onViewDevices={openDevicesDrawer}
        onAssignServicePoints={openAssignDrawer}
        getAssignedServicePointCount={(user) => assignmentsFor(user).length}
      />

      <UserFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        onSubmit={handleSubmit}
      />
      <PermissionsModal
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
        user={permissionsUser}
        matrix={rolePerms}
      />
      <RolePermissionsModal
        open={rolePermsOpen}
        onOpenChange={setRolePermsOpen}
        matrix={rolePerms}
        onSave={(matrix) => saveRolePerms.mutate(matrix)}
      />
      <UserDeviceDrawer
        user={devicesUser}
        open={devicesDrawerOpen}
        onClose={() => setDevicesDrawerOpen(false)}
      />
      <AssignServicePointsDrawer
        user={assignUser}
        open={assignDrawerOpen}
        onClose={() => setAssignDrawerOpen(false)}
        assignments={assignUserAssignments}
        onSave={handleSaveAssignments}
      />
    </div>
  )
}
