import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ProjectInvoice, ProjectSummary } from "../project-schemas";
import { formatInr, formatShortDate } from "../project-schemas";
import { INVOICE_STATUS_COLORS } from "../../clients/constants";

type Props = {
  invoices: ProjectInvoice[];
  summary: ProjectSummary | null | undefined;
};

export function ProjectInvoicesTab({ invoices, summary }: Props) {
  const collectionPct = summary?.collection_pct ?? 0;
  const paid = summary?.collected_cents ?? 0;
  const pending = summary?.pending_cents ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <h3 className="text-sm font-semibold">Collection progress</h3>
          <span className="text-lg font-bold text-primary">{collectionPct}%</span>
        </div>
        <Progress value={collectionPct} className="h-2.5" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</p>
            <p className="text-lg font-semibold text-emerald-700">{formatInr(paid)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold text-amber-800">{formatInr(pending)}</p>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices linked to this project yet.</p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv, idx) => {
            const isPaid = inv.status === "paid";
            const isPending = inv.status === "sent" || inv.status === "pending" || inv.status === "overdue";
            return (
              <li key={inv.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
                <div>
                  <Link to={`/invoices/${inv.id}`} className="font-semibold hover:underline">
                    {inv.invoice_number ?? `Invoice #${String(idx + 1).padStart(3, "0")}`}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatInr(inv.total_cents)}
                    {inv.due_at && !isPaid && ` · Due ${formatShortDate(inv.due_at)}`}
                  </p>
                </div>
                <Badge variant="outline" className={INVOICE_STATUS_COLORS[inv.status ?? "draft"] ?? ""}>
                  {isPaid ? "Paid" : isPending ? "Pending" : inv.status === "draft" ? "Upcoming" : inv.status ?? "Draft"}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
