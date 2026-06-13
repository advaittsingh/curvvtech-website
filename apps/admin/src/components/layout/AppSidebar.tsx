import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, LogOut, X } from "lucide-react";
import { useAuth } from "@/app/providers";
import { NAV_GROUPS } from "@/lib/nav-config";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AppSidebarProps = {
  onClose?: () => void;
  onSignOut: () => void;
};

export function AppSidebar({ onClose, onSignOut }: AppSidebarProps) {
  const location = useLocation();
  const { permissions } = useAuth();

  return (
    <aside className="w-60 bg-white lg:bg-transparent flex flex-col relative z-10 h-full border-r border-stone-200 lg:border-0">
      <div className="p-6 pb-2 relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">CurvvTech</h1>
          <p className="text-[11px] text-stone-500 uppercase tracking-wide">Business OS</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden p-1">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 relative z-10">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || hasPermission(permissions, item.permission),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label || "root"}>
              {group.label && (
                <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/" && location.pathname.startsWith(item.href + "/"));
                  return (
                    <NavLink key={item.href} to={item.href} onClick={onClose}>
                      <div
                        className={cn(
                          "flex items-center text-sm font-normal rounded-lg cursor-pointer px-3 py-2 transition-colors",
                          isActive
                            ? "bg-stone-800 text-stone-50 shadow-sm"
                            : "text-stone-700 hover:bg-stone-100",
                        )}
                      >
                        <Icon className="mr-3 w-4 h-4 shrink-0" />
                        {item.title}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center w-full px-3 py-2 text-sm rounded-lg text-stone-700 hover:bg-stone-100"
          >
            <LogOut className="mr-3 w-4 h-4" />
            Sign out
          </button>
          <NavLink to="/documentation" onClick={onClose}>
            <div
              className={cn(
                "flex items-center text-sm rounded-lg px-3 py-2 mt-1",
                location.pathname === "/documentation"
                  ? "bg-stone-800 text-stone-50"
                  : "text-stone-700 hover:bg-stone-100",
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
