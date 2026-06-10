import { NavLink, useLocation } from "react-router-dom";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Users,
  Receipt,
  BarChart3,
  UserCog,
  MessageCircle,
  X,
  CalendarDays,
  LogOut,
  BookOpen,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Chat", href: "/chat-dashboard", icon: MessageCircle },
  { title: "Blogs", href: "/blogs", icon: FileText },
  { title: "Leads", href: "/leads", icon: Inbox },
  { title: "AI agent", href: "/dashboard/ai-agent", icon: PhoneCall },
  { title: "Demo requests", href: "/demo-requests", icon: CalendarDays },
  { title: "Clients", href: "/clients", icon: Users },
  { title: "Invoices", href: "/invoices", icon: Receipt },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Team", href: "/team", icon: UserCog },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();

  return (
    <aside className="w-60 bg-white lg:bg-transparent flex flex-col relative z-10 h-full border-r border-stone-200 lg:border-0">
      {/* Brand Header */}
      <div className="p-6 pb-0 relative z-10 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-900">
          CurvvTech Admin
        </h1>
        {/* Close button for mobile */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink key={item.href} to={item.href}>
              <div
                className={cn(
                  "flex items-center text-sm font-normal rounded-lg cursor-pointer",
                  isActive
                    ? "px-3 py-2 shadow-sm hover:shadow-md bg-stone-800 hover:bg-stone-700 relative bg-gradient-to-b from-stone-700 to-stone-800 border border-stone-900 text-stone-50 hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none duration-300 ease-in align-middle select-none font-sans text-center antialiased"
                    : "px-3 py-2 text-stone-700 hover:bg-stone-100 transition-colors duration-200 border border-transparent"
                )}
              >
                <Icon className="mr-3 w-4 h-4" />
                {item.title}
              </div>
            </NavLink>
          );
        })}

        {/* Sign Out */}
        <div className="pt-4 border-t border-stone-200 mt-4">
          <button
            type="button"
            onClick={() => {
              clearSession();
              window.location.href = window.location.origin + window.location.pathname + "#/auth/sign-in";
            }}
            className="flex items-center w-full px-3 py-2 text-sm font-normal rounded-lg text-stone-700 hover:bg-stone-100 transition-colors duration-200 border border-transparent"
          >
            <LogOut className="mr-3 w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Documentation Link */}
        <div className="mt-auto pt-4 border-t border-stone-200">
          <NavLink to="/documentation">
            <div
              className={cn(
                "flex items-center text-sm font-normal rounded-lg cursor-pointer",
                location.pathname === "/documentation"
                  ? "px-3 py-2 shadow-sm hover:shadow-md bg-stone-800 hover:bg-stone-700 relative bg-gradient-to-b from-stone-700 to-stone-800 border border-stone-900 text-stone-50 hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none duration-300 ease-in align-middle select-none font-sans text-center antialiased"
                  : "px-3 py-2 text-stone-700 hover:bg-stone-100 transition-colors duration-200"
              )}
            >
              <BookOpen className="mr-3 w-4 h-4" />
              Documentation
            </div>
          </NavLink>
        </div>
      </nav>

    </aside>
  );
}
