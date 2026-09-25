import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { inboxUnreadTotal, useInboxUnreadCount } from "@/features/inbox/hooks/useInboxUnreadCount";

/** Top-bar shortcut to the Inbox with a live unread indicator. */
export function InboxButton() {
  const { permissions } = useAuth();
  const canSeeInbox = hasPermission(permissions, "leads.view");
  const { data } = useInboxUnreadCount();

  if (!canSeeInbox) return null;

  const unread = inboxUnreadTotal(data);

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/inbox" aria-label="Inbox">
        <MessageSquare className="h-5 w-5 text-stone-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
