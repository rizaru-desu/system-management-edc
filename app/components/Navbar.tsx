import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LuBell,
  LuChevronDown,
  LuChevronsUpDown,
  LuClock,
  LuCommand,
  LuIdCard,
  LuLogOut,
  LuMail,
  LuMapPin,
  LuMenu,
  LuSearch,
  LuShield,
  LuUser,
} from "react-icons/lu";

import { useAuth } from "~/context/AuthContext";
import { ROLES } from "~/data/mockData";

import type { RoleKey } from "~/data/mockData";

type NavbarProps = {
  sidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
};

export function Navbar({ sidebarCollapsed, onOpenMobileSidebar }: NavbarProps) {
  const { user, activeRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleOpen, setRoleOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (roleRef.current && !roleRef.current.contains(target)) {
        setRoleOpen(false);
      }

      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (!user) return null;

  const currentRole =
    ROLES.find((role) => role.key === activeRole) ?? ROLES[0];

  const breadcrumb =
    location.pathname
      .replace("/app/", "")
      .split("/")
      .filter(Boolean)
      .map((segment) => segment.replace(/-/g, " "))
      .join(" / ") || "Overview";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#DDE0EC] bg-[#F6F7F9]/85 px-4 backdrop-blur-xl transition-all duration-300 sm:px-6 ${
        sidebarCollapsed ? "md:ml-[72px]" : "md:ml-64"
      }`}
      data-testid="navbar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DDE0EC] bg-white text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40 md:hidden"
          aria-label="Open navigation"
          onClick={onOpenMobileSidebar}
        >
          <LuMenu className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
            Operations Console
          </p>
          <p
            className="truncate text-sm font-medium capitalize text-[#0E2748]"
            data-testid="navbar-breadcrumb"
          >
            {breadcrumb}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="hidden h-9 min-w-[260px] cursor-text items-center gap-2 rounded-lg border border-[#DDE0EC] bg-white px-3 text-sm text-[#0E2748]/60 transition-colors hover:border-[#3F6FA8] lg:flex"
          data-testid="navbar-search"
        >
          <LuSearch className="h-4 w-4 text-[#3F6FA8]" strokeWidth={1.75} />
          <span className="flex-1">Search merchants, terminals, JOs...</span>
          <span className="flex items-center gap-1 rounded bg-[#DDE0EC] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#3F6FA8]">
            <LuCommand className="h-3 w-3" strokeWidth={2} />K
          </span>
        </div>

        <div className="relative" ref={roleRef}>
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-md border border-[#DDE0EC] bg-white px-3 text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40"
            onClick={() => setRoleOpen((current) => !current)}
            data-testid="navbar-role-switcher"
          >
            <LuShield className="hidden h-3.5 w-3.5 text-[#3F6FA8] sm:block" strokeWidth={1.75} />
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${currentRole.color}`}
            >
              {currentRole.short}
            </span>
            <LuChevronsUpDown
              className="hidden h-3.5 w-3.5 text-[#0E2748]/50 sm:block"
              strokeWidth={1.75}
            />
          </button>
          {roleOpen ? (
            <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-lg border border-[#DDE0EC] bg-white p-1 shadow-xl">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#3F6FA8]">
                Switch active role
              </p>
              <div className="my-1 h-px bg-[#DDE0EC]" />
              {ROLES.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[#0E2748] transition-colors hover:bg-[#DDE0EC]/40"
                  onClick={() => {
                    switchRole(role.key as RoleKey);
                    setRoleOpen(false);
                  }}
                  data-testid={`role-option-${role.key}`}
                >
                  <span className={`h-2 w-2 rounded-full ${role.color.split(" ")[0]}`} />
                  <span className="flex-1">{role.label}</span>
                  {role.key === activeRole ? (
                    <span className="text-[10px] font-semibold text-[#3F6FA8]">
                      Active
                    </span>
                  ) : null}
                </button>
              ))}
              <div className="my-1 h-px bg-[#DDE0EC]" />
              <p className="px-2 py-1.5 text-[11px] text-[#0E2748]/60">
                Sidebar menu adapts based on your active role.
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[#DDE0EC] bg-white transition-colors hover:bg-[#DDE0EC]/40"
          data-testid="navbar-notifications"
          aria-label="Notifications"
        >
          <LuBell className="h-4 w-4 text-[#0E2748]" strokeWidth={1.75} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#3F6FA8] ring-2 ring-[#F6F7F9]" />
        </button>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-[#DDE0EC]/50"
            onClick={() => setUserOpen((current) => !current)}
            data-testid="navbar-user-trigger"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3F6FA8] to-[#0E2748] text-xs font-semibold text-white">
              {user.initials}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-xs font-semibold text-[#0E2748]">{user.name}</p>
              <p className="text-[10px] text-[#0E2748]/60">
                {currentRole.label}
              </p>
            </div>
            <LuChevronDown
              className="hidden h-3.5 w-3.5 text-[#0E2748]/50 sm:block"
              strokeWidth={2}
            />
          </button>
          {userOpen ? (
            <div
              className="absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#DDE0EC] bg-white shadow-xl"
              data-testid="navbar-user-popover"
            >
              <div className="bg-[#0E2748] p-5 text-white">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#3F6FA8] to-white/20 text-base font-semibold text-white">
                    {user.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold">{user.name}</p>
                    <span
                      className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${currentRole.color}`}
                    >
                      {currentRole.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {[
                  { icon: LuMail, label: "Email", value: user.email },
                  { icon: LuIdCard, label: "Employee ID", value: user.employeeId },
                  { icon: LuUser, label: "Department", value: user.department },
                  { icon: LuMapPin, label: "Location", value: user.location },
                  { icon: LuClock, label: "Last login", value: user.lastLogin },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-[#DDE0EC]/40"
                  >
                    <row.icon
                      className="h-3.5 w-3.5 shrink-0 text-[#3F6FA8]"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-[#0E2748]/50">
                        {row.label}
                      </p>
                      <p className="truncate text-xs font-medium text-[#0E2748]">
                        {row.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#DDE0EC] p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-[#0E2748] transition-colors hover:bg-rose-50 hover:text-rose-600"
                  data-testid="navbar-logout-button"
                >
                  <LuLogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
