import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/data/mockData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Search, Bell, ChevronDown, LogOut, User as UserIcon, Mail, MapPin,
  IdCard, Clock, Shield, ChevronsUpDown, Command,
} from "lucide-react";

const Navbar = ({ sidebarCollapsed }) => {
  const { user, activeRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const currentRole = ROLES.find((r) => r.key === activeRole) || ROLES[0];

  const breadcrumb = location.pathname
    .replace("/app/", "")
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/([A-Z])/g, " $1").trim())
    .join(" / ");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className={`h-16 sticky top-0 z-30 bg-[#F6F7F9]/85 backdrop-blur-xl border-b border-[#DDE0EC] flex items-center justify-between px-6 transition-all duration-300 ${
        sidebarCollapsed ? "ml-[72px]" : "ml-64"
      }`}
      data-testid="navbar"
    >
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
            Operations Console
          </p>
          <p className="text-sm font-medium text-[#0E2748] capitalize" data-testid="navbar-breadcrumb">
            {breadcrumb || "Overview"}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-[#DDE0EC] text-sm text-[#0E2748]/60 min-w-[260px] hover:border-[#3F6FA8] transition-colors cursor-text" data-testid="navbar-search">
          <Search className="w-4 h-4 text-[#3F6FA8]" strokeWidth={1.75} />
          <span className="flex-1">Search merchants, terminals, JOs…</span>
          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#DDE0EC] text-[#3F6FA8]">
            <Command className="w-3 h-3" strokeWidth={2} />K
          </span>
        </div>

        {/* Role switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 gap-2 border-[#DDE0EC] bg-white hover:bg-[#DDE0EC]/40 hover:text-[#0E2748]"
              data-testid="navbar-role-switcher"
            >
              <Shield className="w-3.5 h-3.5 text-[#3F6FA8]" strokeWidth={1.75} />
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${currentRole.color}`}>
                {currentRole.short}
              </span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#0E2748]/50" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#3F6FA8]">
              Switch active role
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={activeRole} onValueChange={switchRole}>
              {ROLES.map((r) => (
                <DropdownMenuRadioItem
                  key={r.key}
                  value={r.key}
                  className="cursor-pointer"
                  data-testid={`role-option-${r.key}`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`w-2 h-2 rounded-full ${r.color.split(" ")[0]}`} />
                    <span className="text-sm">{r.label}</span>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-[11px] text-[#0E2748]/60">
              Sidebar menu adapts based on your active role.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="outline" size="icon" className="h-9 w-9 relative border-[#DDE0EC] bg-white hover:bg-[#DDE0EC]/40" data-testid="navbar-notifications">
          <Bell className="w-4 h-4 text-[#0E2748]" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3F6FA8] ring-2 ring-[#F6F7F9]" />
        </Button>

        {/* User */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-[#DDE0EC]/50 transition-colors"
              data-testid="navbar-user-trigger"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3F6FA8] to-[#0E2748] text-white text-xs font-semibold flex items-center justify-center">
                {user.initials}
              </div>
              <div className="hidden sm:block leading-tight text-left">
                <p className="text-xs font-semibold text-[#0E2748]">{user.name}</p>
                <p className="text-[10px] text-[#0E2748]/60">{currentRole.label}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#0E2748]/50 hidden sm:block" strokeWidth={2} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 overflow-hidden" data-testid="navbar-user-popover">
            <div className="bg-[#0E2748] p-5 text-white">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3F6FA8] to-white/20 text-white text-base font-semibold flex items-center justify-center border border-white/20">
                  {user.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-base truncate">{user.name}</p>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded ${currentRole.color}`}>
                    {currentRole.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2">
              {[
                { icon: Mail, label: "Email", value: user.email },
                { icon: IdCard, label: "Employee ID", value: user.employeeId },
                { icon: UserIcon, label: "Department", value: user.department },
                { icon: MapPin, label: "Location", value: user.location },
                { icon: Clock, label: "Last login", value: user.lastLogin },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#DDE0EC]/40 transition-colors">
                  <row.icon className="w-3.5 h-3.5 text-[#3F6FA8] shrink-0" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#0E2748]/50">{row.label}</p>
                    <p className="text-xs font-medium text-[#0E2748] truncate">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#DDE0EC] p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-[#0E2748] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                data-testid="navbar-logout-button"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default Navbar;
