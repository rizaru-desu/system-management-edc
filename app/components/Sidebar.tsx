import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  LuChevronRight,
  LuCpu,
  LuFolder,
  LuLock,
  LuPanelLeft,
  LuX,
} from "react-icons/lu";

import { useAuth } from "~/context/AuthContext";
import { SIDEBAR_MENU } from "~/data/mockData";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const { activeRole } = useAuth();
  const location = useLocation();

  const filteredMenu = useMemo(() => {
    if (!activeRole) return [];

    return SIDEBAR_MENU.filter((group) =>
      group.allowedRoles.includes(activeRole),
    )
      .map((group) => ({
        ...group,
        submenus: group.submenus.filter((submenu) =>
          submenu.allowedRoles.includes(activeRole),
        ),
      }))
      .filter((group) => group.submenus.length > 0);
  }, [activeRole]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isExpanded = !collapsed || mobileOpen;

  const toggleGroup = (parent: string) => {
    setOpenGroups((current) => ({ ...current, [parent]: !current[parent] }));
  };

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-[#0E2748]/45 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Close navigation"
        onClick={onCloseMobile}
      />
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-[#0E2748] text-[#DDE0EC] transition-all duration-300 ${
          collapsed ? "md:w-[72px]" : "md:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} w-72 max-w-[86vw]`}
        data-testid="sidebar"
      >
        <div
          className={`flex h-16 items-center border-b border-white/5 px-4 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3F6FA8]">
              <LuCpu className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
            {isExpanded ? (
              <div className="leading-tight">
                <p className="font-bold tracking-tight text-white">EDC.OS</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#DDE0EC]/50">
                  Console
                </p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#DDE0EC]/70 transition-colors hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Close navigation"
            onClick={onCloseMobile}
          >
            <LuX className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <nav
          className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4"
          data-testid="sidebar-nav"
        >
          {isExpanded ? (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#DDE0EC]/40">
              Modules
            </p>
          ) : null}

          <NavLink
            to="/app/dashboard"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#3F6FA8] text-white"
                  : "text-[#DDE0EC]/80 hover:bg-white/5 hover:text-white"
              }`
            }
            data-testid="sidebar-link-dashboard"
          >
            <LuFolder className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {isExpanded ? <span>Overview</span> : null}
          </NavLink>

          <div className="mt-3 space-y-0.5">
            {filteredMenu.map((group, index) => {
              const Icon = group.icon;
              const isOpen = openGroups[group.parent] ?? index === 0;
              const isGroupActive = group.submenus.some((submenu) =>
                location.pathname.endsWith(`/app/${submenu.path}`),
              );

              return (
                <div key={group.parent}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.parent)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isGroupActive
                        ? "bg-white/5 text-white"
                        : "text-[#DDE0EC]/80 hover:bg-white/5 hover:text-white"
                    }`}
                    data-testid={`sidebar-group-${group.parent
                      .replace(/[^a-z0-9]/gi, "-")
                      .toLowerCase()}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                    {isExpanded ? (
                      <>
                        <span className="flex-1 text-left">{group.parent}</span>
                        <LuChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isOpen ? "rotate-90" : ""
                          }`}
                          strokeWidth={2}
                        />
                      </>
                    ) : null}
                  </button>

                  {isExpanded && isOpen ? (
                    <div className="animate-fade-up mb-2 ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-4">
                      {group.submenus.map((submenu) => (
                        <NavLink
                          key={submenu.path}
                          to={`/app/${submenu.path}`}
                          onClick={onCloseMobile}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors ${
                              isActive
                                ? "bg-[#3F6FA8]/40 font-medium text-white"
                                : "text-[#DDE0EC]/60 hover:bg-white/5 hover:text-white"
                            }`
                          }
                          data-testid={`sidebar-link-${submenu.path
                            .replace(/[^a-z0-9]/gi, "-")
                            .toLowerCase()}`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                          <span className="flex-1 truncate">{submenu.title}</span>
                          {submenu.requiresDataMasking ? (
                            <LuLock className="h-3 w-3 opacity-50" strokeWidth={2} />
                          ) : null}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="hidden border-t border-white/5 p-3 md:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-[#DDE0EC]/60 transition-colors hover:bg-white/5 hover:text-white"
            data-testid="sidebar-toggle-button"
          >
            <LuPanelLeft className="h-4 w-4" strokeWidth={1.75} />
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
