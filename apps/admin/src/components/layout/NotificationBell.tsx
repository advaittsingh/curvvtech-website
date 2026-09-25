import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-stone-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button type="button" className="text-xs text-stone-500 hover:text-stone-800" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && notifications.length === 0 ? (
          <p className="px-2 py-4 text-sm text-stone-500 text-center">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-4 text-sm text-stone-500 text-center">No notifications</p>
        ) : (
          notifications.slice(0, 10).map((n) => {
            const content = (
              <>
                <span className="font-medium text-stone-800 text-sm">{n.title}</span>
                {n.body && <span className="text-xs text-stone-500 line-clamp-2">{n.body}</span>}
                <span className="text-[10px] text-stone-400">{formatWhen(n.createdAt)}</span>
              </>
            );

            if (n.href) {
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={cn("flex flex-col items-start gap-0.5 py-2", !n.read && "bg-stone-50")}
                  asChild
                >
                  <Link to={n.href} onClick={() => markRead(n.id)}>
                    {content}
                  </Link>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={n.id}
                className={cn("flex flex-col items-start gap-0.5 py-2", !n.read && "bg-stone-50")}
                onClick={() => markRead(n.id)}
              >
                {content}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
