import { Sparkles } from "lucide-react";
import type { ExpenseAiInsight, ExpenseBurn } from "../expense-schemas";
import { categoryLabel, formatInr } from "../expense-schemas";

type Props = {
  insight: ExpenseAiInsight | undefined;
  burn: ExpenseBurn | undefined;
};

export function ExpenseIntelligencePanel({ insight, burn }: Props) {
  const ai = insight;
  const mom = ai?.month_over_month_pct;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-br from-amber-50/80 to-card dark:from-amber-950/20 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-semibold">AI expense intelligence</p>
        </div>
        <p className="text-sm">{ai?.insight ?? "Loading insights…"}</p>
        {ai?.largest_category && (
          <p className="text-sm mt-2">
            Largest spend:{" "}
            <span className="font-semibold">
              {categoryLabel(ai.largest_category)} ({formatInr(ai.largest_category_cents)})
            </span>
          </p>
        )}
        {mom !== null && mom !== undefined && (
          <p className="text-xs text-muted-foreground mt-2">
            Compared to last month:{" "}
            <span className={mom >= 0 ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>
              {mom >= 0 ? "+" : ""}
              {mom}%
            </span>
          </p>
        )}
        {(ai?.potential_savings_cents ?? 0) > 0 && (
          <p className="text-sm mt-2">
            Potential savings:{" "}
            <span className="font-semibold text-emerald-700 tabular-nums">
              {formatInr(ai!.potential_savings_cents)}
            </span>
          </p>
        )}
        {ai?.recommended_action && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2">
            Recommendation: {ai.recommended_action}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">Monthly burn</p>
        <p className="text-2xl font-bold tabular-nums">{formatInr(burn?.monthly_burn_cents)}</p>
        <p className="text-xs text-muted-foreground mt-1">Average monthly spend (6-month rolling)</p>
        {burn?.runway_months != null && burn.runway_months > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Estimated runway</p>
            <p className="text-lg font-semibold mt-0.5">{burn.runway_months} months</p>
          </div>
        )}
      </div>
    </div>
  );
}
