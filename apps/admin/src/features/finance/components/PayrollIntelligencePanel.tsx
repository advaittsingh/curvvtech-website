import { Sparkles } from "lucide-react";
import type { PayrollAiInsight } from "../payroll-schemas";
import { formatInr } from "../payroll-schemas";

export function PayrollIntelligencePanel({ insight }: { insight: PayrollAiInsight | undefined }) {
  const ai = insight;
  const growth = ai?.payroll_growth_pct;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-violet-50/80 to-card dark:from-violet-950/20 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <p className="text-sm font-semibold">AI payroll intelligence</p>
      </div>
      <p className="text-sm">{ai?.insight ?? "Loading insights…"}</p>
      {growth !== null && growth !== undefined && (
        <p className="text-xs text-muted-foreground mt-2">
          Payroll growth:{" "}
          <span className={growth >= 0 ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>
            {growth >= 0 ? "+" : ""}
            {growth}%
          </span>
        </p>
      )}
      {(ai?.upcoming_payout_cents ?? 0) > 0 && (
        <p className="text-sm mt-2">
          Upcoming payout:{" "}
          <span className="font-semibold tabular-nums">{formatInr(ai!.upcoming_payout_cents)}</span>
          {ai?.upcoming_days != null && (
            <span className="text-muted-foreground"> due in {ai.upcoming_days} days</span>
          )}
        </p>
      )}
      {ai?.risk_note && (
        <p className="text-xs text-red-600 mt-2 font-medium">Risk: {ai.risk_note}</p>
      )}
      {ai?.recommended_action && (
        <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2">
          Recommendation: {ai.recommended_action}
        </p>
      )}
    </div>
  );
}
