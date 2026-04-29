import { useState } from "react";
import { Navigate, Outlet } from "react-router";

import { Navbar } from "~/components/Navbar";
import { Sidebar } from "~/components/Sidebar";
import { useAuth } from "~/context/AuthContext";

export function AppLayout() {
  const { user, ready } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!ready) return <div className="min-h-screen bg-[#F6F7F9]" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Navbar
        sidebarCollapsed={collapsed}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />
      <main
        className={`min-h-[calc(100vh-4rem)] p-4 transition-all duration-300 sm:p-6 md:p-8 ${
          collapsed ? "md:ml-[72px]" : "md:ml-64"
        }`}
        data-testid="app-main"
      >
        <Outlet />
      </main>
    </div>
  );
}
