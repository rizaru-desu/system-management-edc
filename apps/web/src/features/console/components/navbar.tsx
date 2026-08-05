import { useLocation } from '@tanstack/react-router'
import {
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Clock,
  Command,
  IdCard,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  Search,
  Shield,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { useSignOut } from '#/features/auth/index.ts'
import { cn } from '#/lib/utils.ts'
import type { Session } from '#/lib/auth-client.ts'
import { ROLES, findMenuEntry } from '../data/menu.ts'
import type { RoleKey } from '../data/menu.ts'

interface ConsoleNavbarProps {
  sidebarCollapsed: boolean
  activeRole: RoleKey
  /**
   * Console roles the signed-in user actually holds (synced from the
   * session). With one role — e.g. a System Administrator — the switcher
   * renders as a static badge with no other options; with several, the
   * dropdown only offers these.
   */
  availableRoles: Array<RoleKey>
  onRoleChange: (role: RoleKey) => void
  session: Session
  /** Opens the sidebar drawer on < lg viewports (hamburger button). */
  onMobileMenu: () => void
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '?'
  )
}

export function ConsoleNavbar({
  sidebarCollapsed,
  activeRole,
  availableRoles,
  onRoleChange,
  session,
  onMobileMenu,
}: ConsoleNavbarProps) {
  const { pathname } = useLocation()
  const signOut = useSignOut()

  const currentRole = ROLES.find((role) => role.key === activeRole) ?? ROLES[0]
  const switchableRoles = ROLES.filter((role) =>
    availableRoles.includes(role.key),
  )
  const { user } = session

  const slug = pathname.replace(/^\//, '')
  const breadcrumb =
    slug === 'dashboard'
      ? 'Overview'
      : (findMenuEntry(slug)?.sub.title ?? slug.replace(/-/g, ' '))

  // Deterministic on server and client — avoids SSR hydration mismatches.
  const signedInSince = new Date(session.session.createdAt)
    .toISOString()
    .slice(0, 10)

  const detailRows = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: IdCard, label: 'User ID', value: user.id },
    { icon: ShieldCheck, label: 'Active role', value: currentRole.label },
    { icon: Clock, label: 'Signed in since', value: signedInSince },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-brand-100 bg-brand-50/85 px-4 backdrop-blur-xl transition-all duration-300 sm:px-6',
        // Keep in sync with the content margin in _authed.tsx: sidebar width
        // plus a 1rem gutter.
        sidebarCollapsed ? 'lg:ml-22' : 'lg:ml-68',
      )}
    >
      {/* Left: drawer trigger (mobile) + breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 lg:hidden"
          onClick={onMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Operations Console
          </p>
          <p className="truncate text-sm font-medium capitalize text-brand-900">
            {breadcrumb || 'Overview'}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Search */}
        <div className="hidden h-9 min-w-[260px] cursor-text items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 text-sm text-brand-900/60 transition-colors hover:border-brand-500 md:flex">
          <Search className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <span className="flex-1">Search merchants, terminals, JOs…</span>
          <span className="flex items-center gap-1 rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] text-brand-500">
            <Command className="h-3 w-3" strokeWidth={2} />K
          </span>
        </div>

        {/* Active role — synced from the session. Single-role accounts (the
            common case, e.g. a System Administrator) just see their role;
            only multi-role accounts get a dropdown, limited to roles they
            actually hold. */}
        {switchableRoles.length <= 1 ? (
          <div
            className="flex h-9 items-center gap-2 rounded-lg border border-brand-100 bg-white px-3"
            title={currentRole.label}
          >
            <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
            {/* The label chip would crowd narrow navbars; the shield alone
                still marks the role below sm. */}
            <span
              className={cn(
                'hidden rounded-md px-2 py-0.5 text-[11px] font-semibold sm:inline-block',
                currentRole.color,
              )}
            >
              {currentRole.short}
            </span>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2">
                <Shield
                  className="h-3.5 w-3.5 text-primary"
                  strokeWidth={1.75}
                />
                {/* The label chip would crowd narrow navbars; the shield +
                  chevron still mark the switcher below sm. */}
                <span
                  className={cn(
                    'hidden rounded-md px-2 py-0.5 text-[11px] font-semibold sm:inline-block',
                    currentRole.color,
                  )}
                >
                  {currentRole.short}
                </span>
                <ChevronsUpDown
                  className="h-3.5 w-3.5 text-brand-900/50"
                  strokeWidth={1.75}
                />
              </Button>
            </DropdownMenuTrigger>
            {/* The console is always light; popovers render in a portal
              outside the shell, so pin light colors against the dark-theme
              tokens. */}
            <DropdownMenuContent
              align="end"
              className="theme-light w-64 border-brand-100 bg-white text-brand-900"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-brand-500">
                Switch active role
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-brand-100" />
              <DropdownMenuRadioGroup
                value={activeRole}
                onValueChange={(value) => onRoleChange(value as RoleKey)}
              >
                {switchableRoles.map((role) => (
                  <DropdownMenuRadioItem
                    key={role.key}
                    value={role.key}
                    className="cursor-pointer text-brand-900 focus:bg-brand-100/40 focus:text-brand-900"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          role.color.split(' ')[0],
                        )}
                      />
                      <span className="text-sm">{role.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator className="bg-brand-100" />
              <p className="px-2 py-1.5 text-[11px] text-brand-900/60">
                Sidebar menu adapts based on your active role.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-brand-50" />
        </Button>

        {/* User */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-brand-100/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 text-xs font-semibold text-white">
                {initialsOf(user.name)}
              </div>
              <div className="hidden leading-tight text-left sm:block">
                <p className="text-xs font-semibold text-brand-900">
                  {user.name}
                </p>
                <p className="text-[10px] text-brand-900/60">
                  {currentRole.label}
                </p>
              </div>
              <ChevronDown
                className="hidden h-3.5 w-3.5 text-brand-900/50 sm:block"
                strokeWidth={2}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="theme-light w-80 overflow-hidden border-brand-100 bg-white p-0 text-brand-900"
          >
            <div className="bg-brand-900 p-5 text-white">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-brand-500 to-white/20 text-base font-semibold text-white">
                  {initialsOf(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate text-base font-bold">
                    {user.name}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold',
                      currentRole.color,
                    )}
                  >
                    {currentRole.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2">
              {detailRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-brand-100/40"
                >
                  <row.icon
                    className="h-3.5 w-3.5 shrink-0 text-brand-500"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-brand-900/50">
                      {row.label}
                    </p>
                    <p className="truncate text-xs font-medium text-brand-900">
                      {row.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-100 p-2">
              <button
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-brand-900 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
              >
                {signOut.isPending ? (
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    strokeWidth={1.75}
                  />
                ) : (
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                )}
                Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
