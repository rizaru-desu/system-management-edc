import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  KeyRound,
  ShieldCheck,
  UserPlus,
  UserRound,
  UserRoundCheck,
} from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'

import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
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
import type { UserRecord } from '../data/users.ts'
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

  const statCards = [
    {
      icon: UserRound,
      label: 'Total users',
      value: stats.total,
      caption: 'Registered console accounts',
      meter: null,
    },
    {
      icon: UserRoundCheck,
      label: 'Active',
      value: stats.active,
      caption: `${shareOfTotal(stats.active)}% of all users`,
      // Emerald = status ("enabled"), same ramp as the table's Active pill.
      meter: {
        percent: shareOfTotal(stats.active),
        fill: 'bg-emerald-500',
        track: 'bg-emerald-100',
      },
    },
    {
      icon: ShieldCheck,
      label: 'System admins',
      value: stats.admins,
      caption: `${shareOfTotal(stats.admins)}% of all users`,
      meter: {
        percent: shareOfTotal(stats.admins),
        fill: 'bg-brand-500',
        track: 'bg-brand-500/15',
      },
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
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {statsQuery.isPending
          ? statCards.map((card) => (
              <Card
                key={card.label}
                className="p-4 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_10px_24px_rgba(14,39,72,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
                <Skeleton className="mt-3 h-3 w-32" />
              </Card>
            ))
          : statCards.map((card) => (
              <Card
                key={card.label}
                className="relative overflow-hidden p-4 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_10px_24px_rgba(14,39,72,0.06)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                {/* soft corner wash, echoing the login page's glow */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/[0.07] blur-2xl" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
                      {card.label}
                    </p>
                    <p className="font-display mt-1.5 text-3xl font-bold leading-none tracking-tight text-brand-900 tabular-nums">
                      {statsQuery.isError ? '—' : card.value.toLocaleString()}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-500/15 bg-gradient-to-br from-brand-500/15 to-brand-500/5 text-brand-500">
                    <card.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </div>
                <p className="mt-2.5 text-[11px] text-brand-900/55">
                  {card.caption}
                </p>
                {card.meter && (
                  <div
                    className={cn(
                      'mt-2 h-1 overflow-hidden rounded-full',
                      card.meter.track,
                    )}
                  >
                    <div
                      className={cn('h-full rounded-full', card.meter.fill)}
                      style={{ width: `${card.meter.percent}%` }}
                    />
                  </div>
                )}
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
    </div>
  )
}
