import { ExternalLink, FolderKanban, Receipt, Sparkles, Bell } from "lucide-react";
import type { Client } from "../schemas";
import {
  CLIENT_STATUS_COLORS,
  CLIENT_STATUS_LABELS,
  formatOwnerDisplay,
  formatRelativeDays,
  formatShortDate,
  healthTier,
  healthTierColor,
  healthTierLabel,
} from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  client: Client;
  healthScore: number;
  lastInteractionAt?: string | null;
  onCreateProject: () => void;
  onCreateInvoice: () => void;
  onPaymentReminder: () => void;
  onOpenPortal: () => void;
  onOpenAi: () => void;
};

export function ClientCommandHeader({
  client,
  healthScore,
  lastInteractionAt,
  onCreateProject,
  onCreateInvoice,
  onPaymentReminder,
  onOpenPortal,
  onOpenAi,
}: Props) {
  const status = String(client.status ?? "active");
  const tier = healthTier(healthScore);
  const owner = formatOwnerDisplay(client.account_manager_email);
  const stKey = status in CLIENT_STATUS_LABELS ? status : "active";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 lg:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight truncate">{client.name ?? "Client"}</h1>
            <p className="text-muted-foreground">
              {client.company ? `Founder • ${client.company}` : client.email ?? "No company"}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Client since {formatShortDate(client.createdAt)}</span>
              <Badge variant="outline" className={CLIENT_STATUS_COLORS[stKey]}>
                {status === "active" ? "🟢 " : ""}{CLIENT_STATUS_LABELS[stKey] ?? status}
              </Badge>
              <Badge variant="outline" className={healthTierColor(tier)}>
                {healthScore}/100 · {healthTierLabel(tier)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground pt-1">
              <span>Owner: <span className="text-foreground font-medium">{owner}</span></span>
              <span>Last interaction: <span className="text-foreground font-medium">{formatRelativeDays(lastInteractionAt ?? client.updatedAt)}</span></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onCreateProject}>
              <FolderKanban className="h-4 w-4 mr-1.5" /> Create project
            </Button>
            <Button size="sm" variant="outline" onClick={onCreateInvoice}>
              <Receipt className="h-4 w-4 mr-1.5" /> Create invoice
            </Button>
            <Button size="sm" variant="outline" onClick={onPaymentReminder}>
              <Bell className="h-4 w-4 mr-1.5" /> Payment reminder
            </Button>
            <Button size="sm" variant="outline" onClick={onOpenPortal}>
              <ExternalLink className="h-4 w-4 mr-1.5" /> Open portal
            </Button>
            <Button size="sm" onClick={onOpenAi}>
              <Sparkles className="h-4 w-4 mr-1.5" /> AI summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
