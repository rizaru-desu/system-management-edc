import { useEffect, useMemo, useState } from 'react'
import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router'

import { sessionQueryOptions } from '#/features/auth/index.ts'
import {
  ConsoleNavbar,
  ConsoleSidebar,
  rolesFromUser,
} from '#/features/console/index.ts'
import type { RoleKey } from '#/features/console/index.ts'
import { cn } from '#/lib/utils.ts'

/**
 * Pathless layout that gates every child route behind a valid session.
 * Unauthenticated visitors are sent to /login carrying the path they wanted,
 * so signing in returns them there. The resolved session is exposed on the
 * route context for children (`Route.useRouteContext()`).
 *
 * Authenticated pages render inside the EDC.OS console shell (fixed sidebar +
 * sticky navbar), ported from apps/web/sample.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions(),
    )
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  component: ConsoleLayout,
})

function ConsoleLayout() {
  const { session } = Route.useRouteContext()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  // Off-canvas drawer state for < lg viewports; the fixed sidebar only
  // reserves layout space from lg up.
  const [mobileOpen, setMobileOpen] = useState(false)
  // The active role is synced from the signed-in user's stored role(s):
  // single-role accounts (e.g. a System Administrator) get no switcher at
  // all, multi-role accounts can only switch between the roles they hold.
  // Accounts with no recognised console role fall back to the SysAdmin menu —
  // visibility here is cosmetic; the backend enforces real access.
  const userRoles = useMemo(
    () => rolesFromUser(session.user.role),
    [session.user.role],
  )
  const defaultRole: RoleKey = userRoles.includes('System_Administrator')
    ? 'System_Administrator'
    : (userRoles[0] ?? 'System_Administrator')
  const [activeRole, setActiveRole] = useState<RoleKey>(defaultRole)

  // Re-sync when the stored roles change mid-session (e.g. an admin edited
  // this account) and the current pick is no longer held.
  useEffect(() => {
    if (userRoles.length > 0 && !userRoles.includes(activeRole)) {
      setActiveRole(
        userRoles.includes('System_Administrator')
          ? 'System_Administrator'
          : userRoles[0],
      )
    }
  }, [userRoles, activeRole])

  // Close the drawer after navigating, and when the viewport grows past the
  // drawer breakpoint (so a stale open state can't linger on desktop).
  useEffect(() => setMobileOpen(false), [pathname])
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="theme-light min-h-screen bg-brand-50">
      <ConsoleSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
        activeRole={activeRole}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <ConsoleNavbar
        sidebarCollapsed={collapsed}
        activeRole={activeRole}
        availableRoles={userRoles}
        onRoleChange={setActiveRole}
        session={session}
        onMobileMenu={() => setMobileOpen(true)}
      />
      <main
        className={cn(
          'min-h-[calc(100vh-4rem)] p-4 transition-all duration-300 sm:p-6 md:p-8',
          // Sidebar width (w-18 / w-64) plus a 1rem gutter between it and
          // the content column.
          collapsed ? 'lg:ml-22' : 'lg:ml-68',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
