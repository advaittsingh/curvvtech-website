import { Menu } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/providers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

type TopBarProps = {
  onMenuClick?: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth();
  const initials = (user?.email?.[0] ?? "A").toUpperCase();

  return (
    <header className="h-14 border-b border-stone-200 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-stone-100">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm text-stone-700 max-w-[140px] truncate">
            {user?.email ?? "Account"}
          </span>
        </Link>
      </div>
    </header>
  );
}
