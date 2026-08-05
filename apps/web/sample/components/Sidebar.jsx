import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { ChevronRight, Cpu } from "lucide-react";
import menuData from "@/data/menu.json";
import { useAuth } from "@/context/AuthContext";

const Sidebar = ({ collapsed, onToggle }) => {
  const { activeRole } = useAuth();
  const location = useLocation();

  const filteredMenu = useMemo(() => {
    return menuData.sidebar_menu
      .filter((g) => g.allowed_roles.includes(activeRole))
      .map((g) => ({
        ...g,
        submenus: g.submenus.filter((s) => s.allowed_roles.includes(activeRole)),
      }))
      .filter((g) => g.submenus.length > 0);
  }, [activeRole]);

  const initialOpen = useMemo(() => {
    const map = {};
    filteredMenu.forEach((g, i) => {
      map[g.parent] = i === 0;
    });
    return map;
  }, [filteredMenu]);
  const [openGroups, setOpenGroups] = useState(initialOpen);

  const toggleGroup = (parent) => {
    setOpenGroups((p) => ({ ...p, [parent]: !p[parent] }));
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#0E2748] text-[#DDE0EC] flex flex-col z-40 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
      data-testid="sidebar"
    >
      {/* Brand */}
      <div className={`h-16 flex items-center border-b border-white/5 px-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#3F6FA8] flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-white" strokeWidth={1.75} />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display font-bold text-white tracking-tight">EDC.OS</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#DDE0EC]/50">Console</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 sidebar-scroll" data-testid="sidebar-nav">
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#DDE0EC]/40 mb-2 px-3">
            Modules
          </p>
        )}
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
              isActive ? "bg-[#3F6FA8] text-white" : "text-[#DDE0EC]/80 hover:bg-white/5 hover:text-white"
            }`
          }
          data-testid="sidebar-link-dashboard"
        >
          <Icons.LayoutDashboard className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>Overview</span>}
        </NavLink>

        <div className="mt-3 space-y-0.5">
          {filteredMenu.map((group) => {
            const Icon = Icons[group.icon] || Icons.Folder;
            const isOpen = openGroups[group.parent];
            const isGroupActive = group.submenus.some((s) =>
              location.pathname.endsWith(`/app/${s.path}`)
            );
            return (
              <div key={group.parent}>
                <button
                  onClick={() => toggleGroup(group.parent)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isGroupActive ? "text-white bg-white/5" : "text-[#DDE0EC]/80 hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid={`sidebar-group-${group.parent.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.parent}</span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        strokeWidth={2}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="ml-4 mt-1 mb-2 pl-4 border-l border-white/10 space-y-0.5 animate-fade-up">
                    {group.submenus.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={`/app/${sub.path}`}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-md text-[13px] transition-colors ${
                            isActive
                              ? "bg-[#3F6FA8]/40 text-white font-medium"
                              : "text-[#DDE0EC]/60 hover:text-white hover:bg-white/5"
                          }`
                        }
                        data-testid={`sidebar-link-${sub.path.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                      >
                        <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                        <span className="flex-1 truncate">{sub.title}</span>
                        {sub.requires_data_masking && (
                          <Icons.Lock className="w-3 h-3 opacity-50" strokeWidth={2} />
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[#DDE0EC]/60 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="sidebar-toggle-button"
        >
          <Icons.PanelLeft className="w-4 h-4" strokeWidth={1.75} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
