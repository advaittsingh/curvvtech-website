import { PartyPopper, UserPlus, FolderKanban, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCreateClient: () => void;
  onCreateProject: () => void;
  onGenerateInvoice: () => void;
  hasClient: boolean;
  hasProject: boolean;
  loading?: string;
};

export function LeadWonBanner({
  onCreateClient,
  onCreateProject,
  onGenerateInvoice,
  hasClient,
  hasProject,
  loading,
}: Props) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/80 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-800 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-500/15 p-2.5">
          <PartyPopper className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">Lead won</h2>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80 mt-1">
            Sales is complete — hand off to Delivery. Create the client record, spin up the project, and invoice.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!hasClient && (
          <Button size="sm" onClick={onCreateClient} disabled={loading === "client"}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Create client
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onCreateProject} disabled={!hasClient || loading === "project"}>
          <FolderKanban className="h-4 w-4 mr-1.5" />
          {hasProject ? "Open project" : "Create project"}
        </Button>
        <Button size="sm" variant="outline" onClick={onGenerateInvoice} disabled={!hasClient || loading === "invoice"}>
          <Receipt className="h-4 w-4 mr-1.5" />
          Generate invoice
        </Button>
      </div>
    </div>
  );
}
