import {
  Archive,
  Bell,
  Calendar,
  CheckCircle2,
  FileSignature,
  FileText,
  FolderKanban,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  lead_won: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  client_created: { icon: UserPlus, className: "text-blue-600 bg-blue-50 border-blue-200" },
  client_archived: { icon: Archive, className: "text-stone-600 bg-stone-50 border-stone-200" },
  client_restored: { icon: UserPlus, className: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  client_deleted: { icon: Archive, className: "text-red-600 bg-red-50 border-red-200" },
  project_created: { icon: FolderKanban, className: "text-violet-600 bg-violet-50 border-violet-200" },
  project_delivered: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  invoice_generated: { icon: Receipt, className: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  invoice_sent: { icon: Mail, className: "text-blue-600 bg-blue-50 border-blue-200" },
  payment_received: { icon: Wallet, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  proposal: { icon: FileSignature, className: "text-orange-600 bg-orange-50 border-orange-200" },
  proposal_sent: { icon: FileSignature, className: "text-orange-600 bg-orange-50 border-orange-200" },
  proposal_viewed: { icon: FileText, className: "text-amber-600 bg-amber-50 border-amber-200" },
  call: { icon: Phone, className: "text-violet-600 bg-violet-50 border-violet-200" },
  discovery_call: { icon: Phone, className: "text-violet-600 bg-violet-50 border-violet-200" },
  call_completed: { icon: Phone, className: "text-violet-600 bg-violet-50 border-violet-200" },
  email: { icon: Mail, className: "text-blue-600 bg-blue-50 border-blue-200" },
  whatsapp: { icon: MessageCircle, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  note_added: { icon: FileText, className: "text-stone-600 bg-stone-50 border-stone-200" },
  status_change: { icon: Sparkles, className: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  created: { icon: UserPlus, className: "text-blue-600 bg-blue-50 border-blue-200" },
  meeting: { icon: Calendar, className: "text-purple-600 bg-purple-50 border-purple-200" },
  reminder: { icon: Bell, className: "text-amber-600 bg-amber-50 border-amber-200" },
};

const DEFAULT = { icon: FileText, className: "text-muted-foreground bg-muted border-border" };

export function TimelineEventIcon({ type, className }: { type: string; className?: string }) {
  const cfg = EVENT_ICONS[type] ?? DEFAULT;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        cfg.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
