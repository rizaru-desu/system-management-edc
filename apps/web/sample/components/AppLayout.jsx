import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

const AppLayout = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Navbar sidebarCollapsed={collapsed} />
      <main
        className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ${
          collapsed ? "ml-[72px]" : "ml-64"
        } p-6 md:p-8`}
        data-testid="app-main"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
