import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  ChevronRight,
  Cpu,
  LayoutDashboard,
  Lock,
  PanelLeft,
} from 'lucide-react'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '#/components/ui/hover-card.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { cn } from '#/lib/utils.ts'
import { filterMenuByRole } from '../data/menu.ts'
import type { MenuSubItem, RoleKey } from '../data/menu.ts'

interface ConsoleSidebarProps {
  /** Desktop-only icon rail state; ignored while the mobile drawer is open. */
  collapsed: boolean
  onToggle: () => void
  activeRole: RoleKey
  /** Off-canvas drawer visibility on < lg viewports. */
  mobileOpen: boolean
  onMobileClose: () => void
}

/** Shared look for submenu entries (inline list and collapsed-rail flyout). */
function SubmenuLink({
  sub,
  active,
  onNavigate,
}: {
  sub: MenuSubItem
  active: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      to={sub.directRoute ?? '/$'}
      params={sub.directRoute ? undefined : { _splat: sub.path }}
      onClick={onNavigate}
      className={cn(
        'group/sub flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
        active
          ? 'bg-gradient-to-r from-brand-500/35 to-brand-500/5 font-medium text-white'
          : 'text-brand-100/60 hover:bg-white/5 hover:text-white',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full transition-all',
          active
            ? 'bg-brand-300 shadow-[0_0_8px_rgba(159,191,232,0.9)]'
            : 'scale-75 bg-current opacity-30 group-hover/sub:opacity-60',
        )}
      />
      <span className="flex-1 truncate">{sub.title}</span>
      {sub.masked && <Lock className="h-3 w-3 opacity-40" strokeWidth={2} />}
    </Link>
  )
}

export function ConsoleSidebar({
  collapsed,
  onToggle,
  activeRole,
  mobileOpen,
  onMobileClose,
}: ConsoleSidebarProps) {
  const { pathname } = useLocation()
  // The drawer always renders at full width, so labels stay visible there
  // even when the desktop rail is collapsed.
  const showLabels = !collapsed || mobileOpen

  const filteredMenu = useMemo(() => filterMenuByRole(activeRole), [activeRole])

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    filteredMenu.forEach((group, index) => {
      map[group.parent] =
        index === 0 || group.submenus.some((sub) => pathname === `/${sub.path}`)
    })
    return map
  })

  // Keep the group that owns the current route open — e.g. after navigating
  // through the collapsed-rail flyout, expanding the rail should already show
  // where you are.
  useEffect(() => {
    const owner = filteredMenu.find((group) =>
      group.submenus.some((sub) => pathname === `/${sub.path}`),
    )
    if (owner) {
      setOpenGroups((previous) =>
        previous[owner.parent]
          ? previous
          : { ...previous, [owner.parent]: true },
      )
    }
  }, [pathname, filteredMenu])

  // Which group's flyout popup is open while the rail is collapsed.
  const [flyout, setFlyout] = useState<string | null>(null)

  const toggleGroup = (parent: string) => {
    // On the collapsed rail submenus have nowhere to render inline, so a
    // click expands the sidebar and leaves the clicked group open.
    if (!showLabels) {
      setOpenGroups((previous) => ({ ...previous, [parent]: true }))
      setFlyout(null)
      onToggle()
      return
    }
    setOpenGroups((previous) => ({ ...previous, [parent]: !previous[parent] }))
  }

  return (
    <>
      {/* Mobile backdrop — clicking it closes the drawer. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-950/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-gradient-to-b from-brand-900 to-brand-950 text-brand-100 transition-[width,transform] duration-300',
          // Off-canvas below lg; the drawer slides in over a backdrop.
          mobileOpen
            ? 'translate-x-0 shadow-2xl shadow-brand-950/60'
            : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-18' : 'lg:w-64',
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-white/10',
            showLabels ? 'px-4' : 'justify-center px-0',
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25 ring-1 ring-white/20">
              <Cpu className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
            {showLabels && (
              <div className="leading-tight">
                <p className="font-display font-bold tracking-tight text-white">
                  EDC.OS
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand-100/50">
                  Console
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard"
                onClick={onMobileClose}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  showLabels
                    ? 'gap-3 px-3 py-2.5'
                    : 'mx-auto h-11 w-11 justify-center',
                  pathname === '/dashboard'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-950/30 ring-1 ring-white/10'
                    : 'text-brand-100/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <LayoutDashboard
                  className="h-4.5 w-4.5 shrink-0"
                  strokeWidth={1.75}
                />
                {showLabels && <span>Overview</span>}
              </Link>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent
                side="right"
                // Measured from the trigger's edge; the 44px square sits 14px
                // inside the 72px rail — 26 leaves a 12px visual gap.
                sideOffset={26}
                className="border-white/10 bg-brand-900 text-white"
              >
                Overview
              </TooltipContent>
            )}
          </Tooltip>

          {/* Section divider between the dashboard shortcut and the modules. */}
          {showLabels ? (
            <p className="mt-5 mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/40">
              Modules
            </p>
          ) : (
            <div className="mx-auto my-3 h-px w-8 bg-white/10" />
          )}

          <div className="space-y-1">
            {filteredMenu.map((group) => {
              const Icon = group.icon
              const isOpen = openGroups[group.parent]
              const isGroupActive = group.submenus.some(
                (sub) => pathname === `/${sub.path}`,
              )
              // Collapsed rail: antd-style flyout — hovering the icon pops
              // the submenu out to the right; clicking still expands the rail.
              if (!showLabels) {
                return (
                  <HoverCard
                    key={group.parent}
                    open={flyout === group.parent}
                    onOpenChange={(open) =>
                      setFlyout(open ? group.parent : null)
                    }
                    openDelay={80}
                    closeDelay={120}
                  >
                    <HoverCardTrigger asChild>
                      <button
                        onClick={() => toggleGroup(group.parent)}
                        aria-label={group.parent}
                        className={cn(
                          'mx-auto flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
                          isGroupActive
                            ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-950/40 ring-1 ring-white/10'
                            : 'text-brand-100/70 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      side="right"
                      align="start"
                      // Measured from the trigger's edge; the 44px square sits
                      // 14px inside the 72px rail — 26 leaves a 12px gap.
                      sideOffset={26}
                      className="w-60 rounded-xl border-white/10 bg-gradient-to-b from-brand-900 to-brand-950 p-2 text-brand-100 shadow-xl shadow-brand-950/50"
                    >
                      <div className="mb-1.5 flex items-center gap-2 border-b border-white/10 px-3 pt-1.5 pb-2.5">
                        <Icon
                          className="h-3.5 w-3.5 text-brand-300"
                          strokeWidth={2}
                        />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-100/60">
                          {group.parent}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        {group.submenus.map((sub) => (
                          <SubmenuLink
                            key={sub.path}
                            sub={sub}
                            active={pathname === `/${sub.path}`}
                            onNavigate={() => setFlyout(null)}
                          />
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )
              }

              return (
                <div key={group.parent}>
                  <button
                    onClick={() => toggleGroup(group.parent)}
                    aria-expanded={isOpen}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5',
                      isGroupActive
                        ? 'text-white'
                        : 'text-brand-100/70 hover:text-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4.5 w-4.5 shrink-0',
                        isGroupActive && 'text-brand-300',
                      )}
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 truncate text-left">
                      {group.parent}
                    </span>
                    {/* Hidden-active hint: the current page lives inside this
                      collapsed group. */}
                    {isGroupActive && !isOpen && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300 shadow-[0_0_6px_rgba(159,191,232,0.8)]" />
                    )}
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 text-brand-100/40 transition-transform duration-200',
                        isOpen && 'rotate-90',
                      )}
                      strokeWidth={2}
                    />
                  </button>

                  {/* Smooth expand/collapse via the grid-rows 0fr→1fr trick;
                    `inert` keeps hidden links out of the tab order. */}
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden" inert={!isOpen}>
                      <div className="mt-1 mb-2 ml-5 space-y-0.5 border-l border-white/10 pl-3">
                        {group.submenus.map((sub) => (
                          <SubmenuLink
                            key={sub.path}
                            sub={sub}
                            active={pathname === `/${sub.path}`}
                            onNavigate={onMobileClose}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        {/* Footer — the icon-rail toggle only exists on desktop; the mobile
          drawer is dismissed via the backdrop or by navigating. */}
        <div className="hidden shrink-0 border-t border-white/10 p-3 lg:block">
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-brand-100/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <PanelLeft
              className={cn(
                'h-4 w-4 transition-transform duration-300',
                collapsed && 'rotate-180',
              )}
              strokeWidth={1.75}
            />
            {showLabels && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
