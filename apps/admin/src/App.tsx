import { HashRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeConfigurator } from "@/components/theme-configurator";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Menu } from "lucide-react";
import { useState } from "react";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Blogs from "@/pages/blogs";
import Leads from "@/pages/leads";
import Clients from "@/pages/clients";
import Invoices from "@/pages/invoices";
import Analytics from "@/pages/analytics";
import Team from "@/pages/team";
import ChatDashboard from "@/pages/chat-dashboard";
import DemoRequests from "@/pages/demo-requests";
import Documentation from "@/pages/documentation";
import AiAgent from "@/pages/ai-agent";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import NotFound from "@/pages/not-found";

function Layout({ children, title, description }: { children: React.ReactNode; title?: string; description?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeConfigOpen, setThemeConfigOpen] = useState(false);

  return (
    <div className="flex h-screen bg-stone-50 grain-texture">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-10
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      <main className="flex-1 overflow-y-auto p-3 lg:p-6 relative z-10 flex flex-col">
        {/* Mobile header with burger menu */}
        <div className="lg:hidden mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        <Card className="flex-1 border border-stone-200 bg-white relative z-20">
          {title && (
            <div className="pt-6 px-3 lg:px-6 pb-4">
              <h1 className="text-xl font-semibold text-stone-900 mb-1">{title}</h1>
              {description && (
                <p className="text-sm text-stone-600">{description}</p>
              )}
              <div className="border-b border-stone-200 mt-4"></div>
            </div>
          )}
          {children}
        </Card>
      </main>
      
      {/* Theme Configurator Modal - Outside sidebar for proper z-index */}
      <ThemeConfigurator 
        isOpen={themeConfigOpen} 
        onClose={() => setThemeConfigOpen(false)} 
      />
    </div>
  );
}

function Router() {
  return (
    <Routes>
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/sign-up" element={<SignUp />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout title="Profile" description="Manage your account settings"><Profile /></Layout></ProtectedRoute>} />
      <Route path="/blogs" element={<ProtectedRoute><Layout title="Blogs" description="Create and manage blog posts"><Blogs /></Layout></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Layout title="Leads" description="Unified inbox for enquiries"><Leads /></Layout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Layout title="Clients" description="Client CRM and projects"><Clients /></Layout></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Layout title="Invoices" description="Invoicing and billing"><Invoices /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Layout title="Analytics" description="Revenue and SaaS metrics"><Analytics /></Layout></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Layout title="Team" description="Team members and roles"><Team /></Layout></ProtectedRoute>} />
      <Route path="/chat-dashboard" element={<ProtectedRoute><Layout title="Chat" description="Live chat and conversations"><ChatDashboard /></Layout></ProtectedRoute>} />
      <Route path="/demo-requests" element={<ProtectedRoute><Layout title="Demo requests" description="FollowUp demo bookings"><DemoRequests /></Layout></ProtectedRoute>} />
      <Route path="/dashboard/ai-agent" element={<ProtectedRoute><Layout title="AI agent" description="AI calling campaigns, logs, and outcomes"><AiAgent /></Layout></ProtectedRoute>} />
      <Route path="/documentation" element={<ProtectedRoute><Layout title="Documentation" description="Installation and project info"><Documentation /></Layout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </HashRouter>
  );
}

export default App;
