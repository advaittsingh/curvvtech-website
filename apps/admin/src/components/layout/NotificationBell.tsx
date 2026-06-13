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

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-stone-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
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
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-sm text-stone-500 text-center">No notifications</p>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn("flex flex-col items-start gap-0.5 py-2", !n.read && "bg-stone-50")}
              onClick={() => markRead(n.id)}
            >
              <span className="font-medium text-stone-800 text-sm">{n.title}</span>
              {n.body && <span className="text-xs text-stone-500">{n.body}</span>}
              <span className="text-[10px] text-stone-400">{new Date(n.createdAt).toLocaleString()}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
