import { Link } from "react-router-dom";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CollectionsAiInsight, UpcomingCollection } from "../payments-schemas";
import { formatInr, formatShortDate } from "../payments-schemas";

type Props = {
  insight: CollectionsAiInsight | undefined;
  upcoming: UpcomingCollection[];
  onGenerateReminder: () => void;
  reminderLoading?: boolean;
};

export function CollectionsSidebar({ insight, upcoming, onGenerateReminder, reminderLoading }: Props) {
  const ai = insight;
  const canRemind = Boolean(ai?.target_invoice_id || ai?.overdue_count);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-br from-violet-50/80 to-card dark:from-violet-950/20 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <p className="text-sm font-semibold">AI collections insight</p>
        </div>
        <p className="text-sm">{ai?.insight ?? "Loading insight…"}</p>
        {ai && ai.expected_recovery_cents > 0 && (
          <p className="text-sm mt-2">
            Expected recovery:{" "}
            <span className="font-semibold tabular-nums">{formatInr(ai.expected_recovery_cents)}</span>
          </p>
        )}
        {ai?.recommended_action && (
          <p className="text-xs text-muted-foreground mt-2">
            Recommended: {ai.recommended_action}
          </p>
        )}
        {ai && (
          <p className="text-xs mt-2">
            Collection probability:{" "}
            <span className="font-semibold text-emerald-700">{ai.collection_probability}%</span>
          </p>
        )}
        <Button
          size="sm"
          className="mt-3 w-full gap-1.5"
          variant={canRemind ? "default" : "secondary"}
          disabled={!canRemind || reminderLoading}
          onClick={onGenerateReminder}
        >
          <Zap className="h-3.5 w-3.5" />
          Generate reminder
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">Upcoming collections</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming due dates scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 8).map((u) => (
              <Link
                key={u.id}
                to={`/invoices/${u.id}`}
                className="block rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {u.due_at ? formatShortDate(u.due_at) : "No date"}
                    </p>
                    <p className="text-sm font-medium mt-0.5">{u.client_name ?? "Client"}</p>
                    {u.project_name && (
                      <p className="text-xs text-muted-foreground">{u.project_name}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold tabular-nums shrink-0">{formatInr(u.total_cents)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
