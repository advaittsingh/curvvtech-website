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

function displayName(email: string | null | undefined): string {
  if (!email) return "User";
  const local = email.split("@")[0] ?? "User";
  return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._]/g, " ");
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth();
  const initials = (user?.email?.[0] ?? "A").toUpperCase();
  const name = displayName(user?.email);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />
        <Link to="/profile" className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted transition-colors">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground leading-tight">{name}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">CurvvTech OS</p>
          </div>
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-muted text-foreground text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
