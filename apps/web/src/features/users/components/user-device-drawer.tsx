import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clock,
  Filter,
  Globe,
  Loader2,
  LogIn,
  LogOut,
  Monitor,
  Smartphone,
  Wifi,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { cn } from '#/lib/utils.ts'
import { describeUserAgent, formatRelativeTime } from '../lib/format.ts'
import type { UserRecord } from '../data/users.ts'
import {
  userDevicesQueryOptions,
  userLoginHistoryInfiniteQueryOptions,
  userSessionsQueryOptions,
  type LoginHistoryEventRecord,
  type LoginHistoryFilters,
  type SessionRecord,
} from '../api/user-devices.ts'
import { RoleBadge } from './role-badge.tsx'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'devices' | 'login-history' | 'sessions'

interface UserDeviceDrawerProps {
  user: UserRecord | null
  open: boolean
  onClose: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BoolBadge({
  value,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  value: boolean
  trueLabel?: string
  falseLabel?: string
}) {
  return (
    <Badge variant={value ? 'danger' : 'success'}>
      {value ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle className="h-3 w-3" />
      )}
      {value ? trueLabel : falseLabel}
    </Badge>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2.5 border-b border-brand-100/70 last:border-0">
      <span className="text-xs font-medium text-brand-900/60">{label}</span>
      <span className="text-xs font-semibold text-brand-900 break-all text-left sm:text-right">
        {value ?? <span className="text-brand-900/30 font-normal">—</span>}
      </span>
    </div>
  )
}

/**
 * Shape-agnostic loading state shared by every tab, so schema changes to the
 * underlying data never require touching the loading UI.
 */
function TabLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2">
      <Loader2
        className="h-6 w-6 animate-spin text-muted-foreground"
        strokeWidth={1.75}
      />
      <p className="text-sm text-brand-900/40">{message}</p>
    </div>
  )
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Devices Tab (Two-Column Layout: Left List 35%, Right Detail 65%)
// ─────────────────────────────────────────────────────────────────────────────

function DevicesTab({ userId }: { userId: string }) {
  const { data: devices = [], isPending, isError } = useQuery(
    userDevicesQueryOptions(userId),
  )
  const [search, setSearch] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  // Filter devices by brand, model, or device ID
  const filteredDevices = useMemo(() => {
    if (!search.trim()) return devices
    const q = search.toLowerCase()
    return devices.filter(
      (d) =>
        (d.brand && d.brand.toLowerCase().includes(q)) ||
        (d.model && d.model.toLowerCase().includes(q)) ||
        (d.deviceId && d.deviceId.toLowerCase().includes(q)) ||
        (d.manufacturer && d.manufacturer.toLowerCase().includes(q)),
    )
  }, [devices, search])

  // Derive selected device (fallback to first device)
  const selectedDevice = useMemo(() => {
    if (selectedDeviceId) {
      const match = devices.find((d) => d.id === selectedDeviceId)
      if (match) return match
    }
    return filteredDevices[0] ?? devices[0] ?? null
  }, [devices, filteredDevices, selectedDeviceId])

  if (isPending) {
    return <TabLoader message="Loading device details..." />
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="Failed to load registered devices."
        description="Please try refreshing or check connection."
      />
    )
  }

  if (devices.length === 0) {
    return (
      <EmptyState
        icon={Smartphone}
        iconChip
        title="No Registered Devices"
        description="This user has not registered any mobile devices yet."
      />
    )
  }

  return (
    <Card className="flex flex-col md:flex-row h-full min-h-[500px] md:min-h-0 overflow-hidden shadow-xs flex-1">
      {/* ── Left Column (35% width) ── */}
      <div className="w-full md:w-[35%] shrink-0 border-b md:border-b-0 md:border-r border-brand-100 flex flex-col bg-brand-50/20 md:h-full min-h-0">
        {/* List Header */}
        <div className="p-4 border-b border-brand-100 bg-white/90 backdrop-blur-xs space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#47618B]">
              Registered Devices
            </h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-100/80 px-1.5 text-xs font-bold text-brand-900">
              {filteredDevices.length}
            </span>
          </div>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search model, brand, ID…"
            containerClassName="min-w-0 flex-1"
          />
        </div>

        {/* Device Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[400px] md:max-h-none min-h-0">
          {filteredDevices.length === 0 ? (
            <div className="py-8 text-center text-xs text-brand-900/40">
              No matching devices
            </div>
          ) : (
            filteredDevices.map((d) => {
              const isSelected = selectedDevice?.id === d.id
              const name =
                [d.brand, d.model].filter(Boolean).join(' ') ||
                `Device ${d.deviceId.slice(0, 8)}`
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDeviceId(d.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-500/[0.07] shadow-xs ring-1 ring-brand-500/20'
                      : 'border-brand-100 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          isSelected
                            ? 'border-brand-500/30 bg-brand-500 text-white'
                            : 'border-brand-100 bg-brand-50 text-brand-500',
                        )}
                      >
                        <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-xs font-semibold',
                            isSelected ? 'text-brand-900' : 'text-brand-900',
                          )}
                        >
                          {name}
                        </p>
                        <p className="truncate text-[10px] text-brand-900/40">
                          {d.deviceId.slice(0, 16)}…
                        </p>
                      </div>
                    </div>
                    <StatusPill active={d.status === 'ACTIVE'} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-brand-900/50 pt-2 border-t border-brand-100/50">
                    <span className="capitalize font-medium">{d.platform}</span>
                    <span>
                      {d.lastLoginAt ? formatRelativeTime(d.lastLoginAt) : 'Never'}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right Column (65% width) — Device Details ── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white p-5 md:p-6 md:h-full min-h-0">
        {selectedDevice ? (
          <div className="space-y-6">
            {/* Header / Display Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-brand-50/80 via-white to-brand-500/[0.04] p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-500 shadow-xs">
                    <Smartphone className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-brand-900 truncate">
                        {[selectedDevice.brand, selectedDevice.model]
                          .filter(Boolean)
                          .join(' ') || selectedDevice.deviceId}
                      </h2>
                      <StatusPill active={selectedDevice.status === 'ACTIVE'} />
                    </div>
                    <p className="text-xs text-brand-900/50 mt-0.5 truncate">
                      {selectedDevice.manufacturer ?? 'Unknown Manufacturer'} • ID:{' '}
                      {selectedDevice.deviceId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Spec Pills */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-brand-100/70">
                <div className="rounded-xl bg-white/90 p-2.5 border border-brand-100">
                  <p className="text-[10px] font-semibold text-brand-900/40 uppercase">Android</p>
                  <p className="text-xs font-bold text-brand-900 truncate">
                    {selectedDevice.androidVersion ? `v${selectedDevice.androidVersion}` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-brand-100">
                  <p className="text-[10px] font-semibold text-brand-900/40 uppercase">SDK</p>
                  <p className="text-xs font-bold text-brand-900 truncate">
                    {selectedDevice.sdkVersion ? `SDK ${selectedDevice.sdkVersion}` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-brand-100">
                  <p className="text-[10px] font-semibold text-brand-900/40 uppercase">App Version</p>
                  <p className="text-xs font-bold text-brand-900 truncate">
                    {selectedDevice.appVersion ? `v${selectedDevice.appVersion}` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-brand-100">
                  <p className="text-[10px] font-semibold text-brand-900/40 uppercase">Last Active</p>
                  <p className="text-xs font-bold text-brand-900 truncate">
                    {selectedDevice.lastLoginAt
                      ? formatRelativeTime(selectedDevice.lastLoginAt)
                      : 'Never'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Information Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900/60 mb-3">
                Device Information &amp; Telemetry
              </h4>
              <Card className="p-4">
                <DetailRow label="Device ID" value={selectedDevice.deviceId} />
                <DetailRow label="Manufacturer" value={selectedDevice.manufacturer} />
                <DetailRow label="Brand" value={selectedDevice.brand} />
                <DetailRow label="Model" value={selectedDevice.model} />
                <DetailRow label="Carrier" value={selectedDevice.carrier} />
                <DetailRow label="Network Type" value={selectedDevice.networkType} />
                <DetailRow
                  label="Root Status"
                  value={
                    <BoolBadge
                      value={selectedDevice.isRooted}
                      trueLabel="Rooted (Risk)"
                      falseLabel="Not Rooted (Clean)"
                    />
                  }
                />
                <DetailRow
                  label="Developer Mode"
                  value={
                    <BoolBadge
                      value={selectedDevice.isDeveloperMode}
                      trueLabel="Enabled"
                      falseLabel="Disabled"
                    />
                  }
                />
                <DetailRow
                  label="Emulator"
                  value={
                    <BoolBadge
                      value={selectedDevice.isEmulator}
                      trueLabel="Emulator"
                      falseLabel="Physical Device"
                    />
                  }
                />
                <DetailRow
                  label="Login Count"
                  value={
                    <span className="font-semibold text-brand-900">
                      {selectedDevice.loginCount}
                    </span>
                  }
                />
                <DetailRow
                  label="First Registered"
                  value={
                    selectedDevice.createdAt
                      ? new Date(selectedDevice.createdAt).toLocaleString()
                      : null
                  }
                />
                <DetailRow
                  label="Last Login"
                  value={
                    selectedDevice.lastLoginAt
                      ? new Date(selectedDevice.lastLoginAt).toLocaleString()
                      : null
                  }
                />
                <DetailRow
                  label="Last Logout"
                  value={
                    selectedDevice.lastLogoutAt
                      ? new Date(selectedDevice.lastLogoutAt).toLocaleString()
                      : null
                  }
                />
                <DetailRow
                  label="FCM Status"
                  value={
                    selectedDevice.fcmToken ? (
                      <span className="font-semibold text-emerald-700">Registered</span>
                    ) : (
                      <span className="text-brand-900/40">Not Registered</span>
                    )
                  }
                />
              </Card>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Smartphone}
            description="Select a device from the list"
            className="h-full py-20"
          />
        )}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Login History Tab
// ─────────────────────────────────────────────────────────────────────────────

interface HistoryDayGroup {
  key: string
  title: string
  /** Full date shown under "Today"/"Yesterday"; null when the title is a date. */
  subtitle: string | null
  isToday: boolean
  items: Array<LoginHistoryEventRecord>
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Buckets newest-first events into calendar-day groups, preserving order. */
function groupByDay(
  items: Array<LoginHistoryEventRecord>,
): Array<HistoryDayGroup> {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const today = startOfDay(new Date())
  const dayMs = 24 * 60 * 60 * 1000

  const map = new Map<string, HistoryDayGroup>()
  for (const item of items) {
    const date = new Date(item.loginAt)
    const day = startOfDay(date)
    const key = String(day)
    let group = map.get(key)
    if (!group) {
      const isToday = day === today
      const isYesterday = day === today - dayMs
      group = {
        key,
        title: isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDayLabel(date),
        subtitle: isToday || isYesterday ? formatDayLabel(date) : null,
        isToday,
        items: [],
      }
      map.set(key, group)
    }
    group.items.push(item)
  }
  return [...map.values()]
}

function EventField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 lg:border-l lg:border-brand-100/80 lg:pl-4">
      <p className="flex items-center gap-1.5 text-[11px] text-brand-900/40">
        <Icon className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-brand-900">
        {value}
      </p>
    </div>
  )
}

function HistoryEventCard({ item }: { item: LoginHistoryEventRecord }) {
  const isLogin = item.eventType === 'login'
  const deviceName =
    [item.brand, item.model].filter(Boolean).join(' ') ||
    `Device ${item.deviceId.slice(0, 8)}`
  const platformLabel = item.platform
    ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1)
    : item.userAgent
      ? describeUserAgent(item.userAgent)
      : null
  const deviceMeta = [
    platformLabel,
    item.appVersion ? `App v${item.appVersion}` : null,
  ]
    .filter(Boolean)
    .join(' • ')
  const time = new Date(item.loginAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <Card className="p-4 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            isLogin ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500',
          )}
        >
          {isLogin ? (
            <LogIn className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-brand-900">
                {isLogin ? 'Login' : 'Logout'}
              </p>
              {/* Only successful events reach the history tables. */}
              <Badge variant={isLogin ? 'success' : 'danger'} size="sm">
                Success
              </Badge>
            </div>
            <p className="text-xs whitespace-nowrap text-brand-900/50">
              {formatRelativeTime(item.loginAt)}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-[1.4fr_1fr_1fr_0.9fr]">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-brand-900">
                {deviceName}
              </p>
              {deviceMeta && (
                <p className="mt-1 truncate text-xs text-brand-900/50">
                  {deviceMeta}
                </p>
              )}
            </div>
            <EventField
              icon={Globe}
              label="IP Address"
              value={item.ipAddress ?? '—'}
            />
            {/* Connection type isn't part of the history payload yet. */}
            <EventField icon={Wifi} label="Connection" value="—" />
            <EventField icon={Clock} label="Time" value={time} />
          </div>
          {item.appVersion && (
            <div className="mt-2 flex justify-end">
              <Badge size="sm">v{item.appVersion}</Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function LoginHistoryTab({ userId }: { userId: string }) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [eventType, setEventType] = useState<'login' | 'logout'>('login')
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'INACTIVE'>('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // All filtering happens server-side; these params ride along on every page
  // request, and changing any of them resets the loaded pages (query key).
  const filters = useMemo<LoginHistoryFilters>(
    () => ({
      search: debouncedSearch.trim() || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      eventType,
      status: status || undefined,
    }),
    [debouncedSearch, from, to, eventType, status],
  )

  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(userLoginHistoryInfiniteQueryOptions(userId, filters))

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  )
  const total = data?.pages.at(-1)?.total ?? 0
  const groups = useMemo(() => groupByDay(items), [items])
  const hasActiveFilters = Boolean(
    filters.search || from || to || status || eventType !== 'login',
  )

  const formatRangeDate = (value: string) =>
    formatDayLabel(new Date(`${value}T00:00:00`))
  const rangeLabel =
    from && to
      ? `${formatRangeDate(from)} – ${formatRangeDate(to)}`
      : from
        ? `From ${formatRangeDate(from)}`
        : to
          ? `Until ${formatRangeDate(to)}`
          : 'All dates'

  return (
    <div className="space-y-4">
      {/* ── Toolbar: search, date range, filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by device or IP address…"
          isFetching={isFetching && !isPending && !isFetchingNextPage}
          containerClassName="min-w-[220px] flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="toolbar">
              <CalendarDays
                className="h-4 w-4 text-brand-500"
                strokeWidth={1.75}
              />
              {rangeLabel}
              <ChevronDown
                className="h-3.5 w-3.5 text-brand-900/50"
                strokeWidth={1.75}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="history-from" className="text-xs text-brand-900/60">
                From
              </Label>
              <Input
                id="history-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 border-brand-100 bg-white text-xs text-brand-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="history-to" className="text-xs text-brand-900/60">
                To
              </Label>
              <Input
                id="history-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 border-brand-100 bg-white text-xs text-brand-900"
              />
            </div>
            {(from || to) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs text-brand-900/60"
                onClick={() => {
                  setFrom('')
                  setTo('')
                }}
              >
                Clear range
              </Button>
            )}
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="toolbar">
              <Filter className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
              Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-brand-500">
              Event type
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={eventType}
              onValueChange={(value) =>
                setEventType(value as 'login' | 'logout')
              }
            >
              <DropdownMenuRadioItem value="login">Login</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="logout">
                Logout
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="bg-brand-100" />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-brand-500">
              Device status
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={status}
              onValueChange={(value) =>
                setStatus(value as '' | 'ACTIVE' | 'INACTIVE')
              }
            >
              <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ACTIVE">
                Active
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="INACTIVE">
                Inactive
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Timeline states ── */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="md:flex md:gap-5">
              <div className="w-[88px] shrink-0 pt-4 max-md:hidden">
                <Skeleton className="h-3.5 w-16" />
              </div>
              <div className="min-w-0 flex-1">
                <Skeleton className="h-[108px] w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          tone="danger"
          title="Failed to load login history."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Clock}
          description={
            hasActiveFilters
              ? 'No activities match the current filters.'
              : 'No login history records found.'
          }
        />
      ) : (
        <>
          <div className="relative">
            {/* Vertical timeline rail (hidden when labels stack on mobile) */}
            <div className="absolute inset-y-2 left-[96px] w-0.5 bg-brand-100 max-md:hidden" />
            <div>
              {groups.map((group) => (
                <div key={group.key} className="md:flex md:gap-5">
                  <div className="relative w-[88px] shrink-0 pt-4 leading-tight max-md:mb-2 max-md:w-auto">
                    <p
                      className={cn(
                        'text-xs font-bold',
                        group.subtitle && 'uppercase tracking-wide',
                        group.isToday ? 'text-brand-500' : 'text-brand-900/70',
                      )}
                    >
                      {group.title}
                    </p>
                    {group.subtitle && (
                      <p className="mt-0.5 text-[11px] text-brand-900/50">
                        {group.subtitle}
                      </p>
                    )}
                    <span
                      className={cn(
                        'absolute top-[18px] -right-4 z-10 hidden h-3.5 w-3.5 rounded-full border-2 md:block',
                        group.isToday
                          ? 'border-brand-500 bg-brand-500 ring-4 ring-brand-500/15'
                          : 'border-brand-300 bg-white',
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 pb-4">
                    {group.items.map((item) => (
                      <HistoryEventCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer: range summary + load more ── */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <p className="text-xs text-brand-900/50">
              Showing 1 to {items.length} of {total} activities
            </p>
            {hasNextPage && (
              <Button
                variant="toolbar"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Load more
                <ChevronDown
                  className="h-3.5 w-3.5 text-brand-900/50"
                  strokeWidth={1.75}
                />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessions Tab
// ─────────────────────────────────────────────────────────────────────────────

function SessionsTab({ userId }: { userId: string }) {
  const { data: sessions = [], isPending, isError } = useQuery(
    userSessionsQueryOptions(userId),
  )

  if (isPending) {
    return <TabLoader message="Loading sessions..." />
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="Failed to load active sessions."
      />
    )
  }

  if (sessions.length === 0) {
    return (
      <EmptyState icon={Wifi} description="No active sessions found." />
    )
  }

  const mostRecent = sessions[0]?.id

  return (
    <div className="space-y-3">
      {sessions.map((s: SessionRecord) => {
        const ua = s.userAgent ? describeUserAgent(s.userAgent) : null
        const isNewest = s.id === mostRecent
        return (
          <Card
            key={s.id}
            className={cn(
              'p-4 transition-all shadow-xs',
              isNewest
                ? 'border-brand-500/40 bg-brand-500/[0.04] ring-1 ring-brand-500/20'
                : 'hover:border-brand-200',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                    isNewest
                      ? 'border-brand-500/30 bg-brand-500 text-white'
                      : 'border-brand-100 bg-brand-50 text-brand-900/40',
                  )}
                >
                  <Monitor className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-brand-900">
                      {ua ?? 'Unknown Client / Browser'}
                    </p>
                    {isNewest && (
                      <Badge variant="primary" size="sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
                        Current
                      </Badge>
                    )}
                  </div>
                  {s.ipAddress && (
                    <p className="flex items-center gap-1 text-xs text-brand-900/50 mt-0.5">
                      <Globe className="h-3.5 w-3.5 text-brand-500" />
                      {s.ipAddress}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-brand-900/70 whitespace-nowrap">
                  {formatRelativeTime(s.createdAt)}
                </p>
                <p className="text-[10px] text-brand-900/40 mt-0.5">
                  Expires {new Date(s.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Global Drawer component (Overlay right side: 85vw, max 1200px)
// ─────────────────────────────────────────────────────────────────────────────

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'devices', label: 'Devices' },
  { key: 'login-history', label: 'Login History' },
  { key: 'sessions', label: 'Sessions' },
]

export function UserDeviceDrawer({
  user,
  open,
  onClose,
}: UserDeviceDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('devices')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background page scrolling while Drawer is open
  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <>
      {/* Backdrop overlay (Global mask: covers entire viewport, keeps page visible behind) */}
      <div
        className="fixed inset-0 z-[99] bg-black/35 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel (Global Right Drawer: 80-90vw, max-width 1200px) */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-[100] flex w-full md:w-[85vw] max-w-[1200px] flex-col bg-white shadow-2xl',
          'border-l border-brand-100',
          'animate-in slide-in-from-right duration-300 ease-out',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Device management for ${user?.name}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-brand-100 bg-white px-6 py-4 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-900 text-sm font-bold text-white shadow-xs">
              {user ? initialsOf(user.name) : '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="truncate text-base font-bold text-brand-900">
                  {user?.name ?? '—'}
                </h2>
                {user?.roles?.map((role) => (
                  <RoleBadge key={role} role={role} short />
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-brand-900/50 mt-0.5 flex-wrap">
                <span className="truncate">{user?.email ?? ''}</span>
                {user?.lastActiveAt && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3 text-brand-500" />
                    Active {formatRelativeTime(user.lastActiveAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="shrink-0 text-brand-900/40 hover:text-brand-900 hover:bg-brand-100/50 rounded-xl"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-brand-100 bg-white px-6">
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors',
                  activeTab === tab.key
                    ? 'text-brand-500'
                    : 'text-brand-900/50 hover:text-brand-900/80',
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content (Scrollable area) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-brand-50 flex flex-col min-h-0">
          {user && (
            <>
              {activeTab === 'devices' && <DevicesTab userId={user.id} />}
              {activeTab === 'login-history' && <LoginHistoryTab userId={user.id} />}
              {activeTab === 'sessions' && <SessionsTab userId={user.id} />}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
