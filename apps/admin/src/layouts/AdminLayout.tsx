import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";

export function AdminLayout() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-sm text-stone-600">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return (
    <div className="flex h-screen bg-stone-50 grain-texture">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-10 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300`}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} onSignOut={() => void logout()} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 lg:p-6">
          <Card className="min-h-full border border-stone-200 bg-white">
            <Outlet />
          </Card>
        </main>
      </div>
    </div>
  );
}
