import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { cn } from '#/lib/utils.ts'
import { describeUserAgent, formatRelativeTime } from '../lib/format.ts'
import type { UserRecord } from '../data/users.ts'
import {
  userDevicesQueryOptions,
  userLoginHistoryQueryOptions,
  userSessionsQueryOptions,
  type LoginHistoryRecord,
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

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-brand-100 text-brand-900/50',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-emerald-500' : 'bg-brand-900/30',
        )}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

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
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        value ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700',
      )}
    >
      {value ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle className="h-3 w-3" />
      )}
      {value ? trueLabel : falseLabel}
    </span>
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-2 h-full">
        <div className="md:col-span-4 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <div className="md:col-span-8 space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="mb-2 h-9 w-9 text-rose-400" strokeWidth={1.5} />
        <p className="text-sm font-medium text-rose-600">Failed to load registered devices.</p>
        <p className="text-xs text-brand-900/40 mt-1">Please try refreshing or check connection.</p>
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100/50 text-brand-900/30">
          <Smartphone className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-brand-900/70">No Registered Devices</p>
        <p className="text-xs text-brand-900/40 mt-1">
          This user has not registered any mobile devices yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[500px] md:min-h-0 rounded-2xl border border-brand-100 bg-white overflow-hidden shadow-xs flex-1">
      {/* ── Left Column (35% width) ── */}
      <div className="w-full md:w-[35%] shrink-0 border-b md:border-b-0 md:border-r border-brand-100 flex flex-col bg-brand-50/20 md:h-full min-h-0">
        {/* List Header */}
        <div className="p-4 border-b border-brand-100 bg-white/90 backdrop-blur-xs space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#47618B]">
              Registered Devices
            </h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DDE0EC]/80 px-1.5 text-xs font-bold text-[#0E2748]">
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
                      ? 'border-[#3F6FA8] bg-[#3F6FA8]/[0.07] shadow-xs ring-1 ring-[#3F6FA8]/20'
                      : 'border-brand-100 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          isSelected
                            ? 'border-[#3F6FA8]/30 bg-[#3F6FA8] text-white'
                            : 'border-brand-100 bg-brand-50 text-[#3F6FA8]',
                        )}
                      >
                        <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-xs font-semibold',
                            isSelected ? 'text-[#0E2748]' : 'text-brand-900',
                          )}
                        >
                          {name}
                        </p>
                        <p className="truncate text-[10px] text-brand-900/40">
                          {d.deviceId.slice(0, 16)}…
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
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
            <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-[#3F6FA8]/[0.04] p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#3F6FA8]/20 bg-[#3F6FA8]/10 text-[#3F6FA8] shadow-xs">
                    <Smartphone className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-brand-900 truncate">
                        {[selectedDevice.brand, selectedDevice.model]
                          .filter(Boolean)
                          .join(' ') || selectedDevice.deviceId}
                      </h2>
                      <StatusBadge status={selectedDevice.status} />
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
            </div>

            {/* Information Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900/60 mb-3">
                Device Information &amp; Telemetry
              </h4>
              <div className="rounded-2xl border border-brand-100 bg-white p-4">
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
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Smartphone className="h-8 w-8 text-brand-900/20 mb-2" />
            <p className="text-sm font-medium text-brand-900/50">Select a device from the list</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Login History Tab
// ─────────────────────────────────────────────────────────────────────────────

function LoginHistoryTab({ userId }: { userId: string }) {
  const { data: history = [], isPending, isError } = useQuery(
    userLoginHistoryQueryOptions(userId),
  )

  if (isPending) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="mb-2 h-8 w-8 text-rose-400" strokeWidth={1.5} />
        <p className="text-sm font-medium text-rose-500">Failed to load login history.</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="mb-2 h-8 w-8 text-brand-900/20" strokeWidth={1.5} />
        <p className="text-sm text-brand-900/40">No login history records found.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-6 py-2">
      {/* Timeline line */}
      <div className="absolute top-2 bottom-2 left-[11px] w-0.5 bg-brand-100" />
      <div className="space-y-4">
        {history.map((entry: LoginHistoryRecord, index: number) => {
          const device =
            [entry.brand, entry.model].filter(Boolean).join(' ') ||
            `Device ${entry.deviceId.slice(0, 8)}`
          const ua = entry.userAgent ? describeUserAgent(entry.userAgent) : null
          return (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={cn(
                  'relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 -translate-x-[5px] rounded-full border-2',
                  index === 0
                    ? 'border-[#3F6FA8] bg-[#3F6FA8] ring-4 ring-[#3F6FA8]/15'
                    : 'border-brand-300 bg-white',
                )}
              />
              <div className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-white p-3.5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-900 truncate">{device}</p>
                    {ua && <p className="text-xs text-brand-900/60 mt-0.5">{ua}</p>}
                    {entry.ipAddress && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-brand-900/40">
                        <Globe className="h-3 w-3 text-[#3F6FA8]" />
                        {entry.ipAddress}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-brand-900/70 whitespace-nowrap">
                      {formatRelativeTime(entry.loginAt)}
                    </p>
                    <p className="text-[10px] text-brand-900/40 mt-0.5">
                      {new Date(entry.loginAt).toLocaleString()}
                    </p>
                    {entry.appVersion && (
                      <span className="mt-1 inline-block rounded-full bg-brand-100/80 px-2 py-0.5 text-[10px] font-semibold text-brand-900/70">
                        v{entry.appVersion}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
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
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="mb-2 h-8 w-8 text-rose-400" strokeWidth={1.5} />
        <p className="text-sm font-medium text-rose-500">Failed to load active sessions.</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Wifi className="mb-2 h-8 w-8 text-brand-900/20" strokeWidth={1.5} />
        <p className="text-sm text-brand-900/40">No active sessions found.</p>
      </div>
    )
  }

  const mostRecent = sessions[0]?.id

  return (
    <div className="space-y-3">
      {sessions.map((s: SessionRecord) => {
        const ua = s.userAgent ? describeUserAgent(s.userAgent) : null
        const isNewest = s.id === mostRecent
        return (
          <div
            key={s.id}
            className={cn(
              'rounded-2xl border p-4 transition-all shadow-xs',
              isNewest
                ? 'border-[#3F6FA8]/40 bg-[#3F6FA8]/[0.04] ring-1 ring-[#3F6FA8]/20'
                : 'border-brand-100 bg-white hover:border-brand-200',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                    isNewest
                      ? 'border-[#3F6FA8]/30 bg-[#3F6FA8] text-white'
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#3F6FA8] px-2 py-0.5 text-[10px] font-semibold text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
                        Current
                      </span>
                    )}
                  </div>
                  {s.ipAddress && (
                    <p className="flex items-center gap-1 text-xs text-brand-900/50 mt-0.5">
                      <Globe className="h-3.5 w-3.5 text-[#3F6FA8]" />
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
          </div>
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
                    <Clock className="h-3 w-3 text-[#3F6FA8]" />
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
                    ? 'text-[#3F6FA8]'
                    : 'text-brand-900/50 hover:text-brand-900/80',
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#3F6FA8]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content (Scrollable area) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F6F7F9] flex flex-col min-h-0">
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
