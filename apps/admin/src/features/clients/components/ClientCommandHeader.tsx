import { ExternalLink, FolderKanban, Receipt, Bell } from "lucide-react";
import type { Client } from "../schemas";
import type { ClientSummary } from "../schemas";
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
import { ClientOverflowMenu } from "./ClientOverflowMenu";
import { GradientAvatar } from "@/components/crm/GradientAvatar";
import { AskAiButton } from "@/components/crm/AskAiButton";
import { buildHealthFactors } from "@/components/crm/RecentActivityWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  client: Client;
  healthScore: number;
  summary?: ClientSummary | null;
  lastInteractionAt?: string | null;
  actionLoading?: string;
  onCreateProject: () => void;
  onCreateInvoice: () => void;
  onPaymentReminder: () => void;
  onOpenPortal: () => void;
  onOpenAi: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onRestore?: () => void;
};

export function ClientCommandHeader({
  client,
  healthScore,
  summary,
  lastInteractionAt,
  actionLoading,
  onCreateProject,
  onCreateInvoice,
  onPaymentReminder,
  onOpenPortal,
  onOpenAi,
  onEdit,
  onArchive,
  onDuplicate,
  onExport,
  onDelete,
  onRestore,
}: Props) {
  const status = String(client.status ?? "active");
  const tier = healthTier(healthScore);
  const owner = formatOwnerDisplay(client.account_manager_email);
  const stKey = status in CLIENT_STATUS_LABELS ? status : "active";
  const isArchived = Boolean(client.is_archived) && !client.deleted_at;
  const isDeleted = Boolean(client.deleted_at);
  const displayName = client.name ?? "Client";
  const healthFactors = buildHealthFactors(summary ?? null);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-5 lg:p-6 space-y-4">
        <div className="flex gap-4 min-w-0">
          <GradientAvatar name={displayName} size="lg" className="hidden sm:flex" />
          <GradientAvatar name={displayName} size="md" className="sm:hidden" />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">{displayName}</h1>
            <p className="text-muted-foreground text-sm sm:text-base truncate">
              {client.company ? `Founder • ${client.company}` : client.email ?? "No company"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={CLIENT_STATUS_COLORS[stKey]}>
                {status === "active" && !isArchived && !isDeleted ? "🟢 " : ""}
                {CLIENT_STATUS_LABELS[stKey] ?? status}
              </Badge>
              {isArchived && (
                <Badge variant="outline" className="bg-stone-100 text-stone-600 border-stone-200">Archived</Badge>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`cursor-help ${healthTierColor(tier)}`}>
                      {healthTierLabel(tier)} ({healthScore})
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs p-3">
                    <p className="font-semibold text-xs mb-2">Health score</p>
                    <ul className="space-y-1 text-xs">
                      {healthFactors.map((f) => (
                        <li key={f.label} className={f.delta > 0 ? "text-emerald-600" : "text-red-600"}>
                          {f.delta > 0 ? "+" : ""}{f.delta} {f.label}
                        </li>
                      ))}
                      {healthFactors.length === 0 && (
                        <li className="text-muted-foreground">Based on engagement and billing</li>
                      )}
                    </ul>
                    <p className="font-bold mt-2 pt-2 border-t">{healthScore}/100</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-6 border-t border-border pt-4 sm:grid-cols-3">
          <MetaItem label="Owner" value={owner} />
          <MetaItem label="Client since" value={formatShortDate(client.createdAt)} />
          <MetaItem label="Last activity" value={formatRelativeDays(lastInteractionAt ?? client.updatedAt)} />
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
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
          <AskAiButton onOpenSummary={onOpenAi} />
          <ClientOverflowMenu
            isArchived={isArchived}
            isDeleted={isDeleted}
            loading={actionLoading}
            onEdit={onEdit}
            onArchive={onArchive}
            onDuplicate={onDuplicate}
            onExport={onExport}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-semibold truncate">{value}</dd>
    </div>
  );
}
