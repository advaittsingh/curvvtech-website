import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, LogOut, X } from "lucide-react";
import { useAuth } from "@/app/providers";
import { getActiveNavHref, NAV_GROUPS } from "@/lib/nav-config";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { inboxUnreadTotal, useInboxUnreadCount } from "@/features/inbox/hooks/useInboxUnreadCount";

type AppSidebarProps = {
  onClose?: () => void;
  onSignOut: () => void;
};

export function AppSidebar({ onClose, onSignOut }: AppSidebarProps) {
  const location = useLocation();
  const { permissions, role } = useAuth();
  const activeHref = getActiveNavHref(location.pathname);

  const { data: unread } = useInboxUnreadCount();
  const inboxUnread = inboxUnreadTotal(unread);

  return (
    <aside className="w-60 bg-card flex flex-col relative z-10 h-full border-r border-border">
      <div className="p-5 pb-2 relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Curvvtech</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">Business OS</p>
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
            (item) =>
              (!item.permission || hasPermission(permissions, item.permission)) &&
              (!item.roles || (role !== null && item.roles.includes(role))) &&
              (!item.hiddenForRoles || role === null || !item.hiddenForRoles.includes(role)),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label || "root"}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeHref === item.href;
                  const badge = item.href === "/inbox" && inboxUnread > 0 ? inboxUnread : 0;
                  return (
                    <NavLink key={item.href} to={item.href} end onClick={onClose}>
                      <div
                        className={cn(
                          "flex items-center text-sm font-normal rounded-lg cursor-pointer px-3 py-2 transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/80 hover:bg-muted",
                        )}
                      >
                        <Icon className="mr-3 w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{item.title}</span>
                        {badge > 0 && (
                          <span
                            className={cn(
                              "ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                              isActive
                                ? "bg-primary-foreground text-primary"
                                : "bg-red-500 text-white",
                            )}
                          >
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center w-full px-3 py-2 text-sm rounded-lg text-foreground/80 hover:bg-muted"
          >
            <LogOut className="mr-3 w-4 h-4" />
            Sign out
          </button>
          <NavLink to="/documentation" onClick={onClose}>
            <div
              className={cn(
                "flex items-center text-sm rounded-lg px-3 py-2 mt-1",
                location.pathname === "/documentation"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted",
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
