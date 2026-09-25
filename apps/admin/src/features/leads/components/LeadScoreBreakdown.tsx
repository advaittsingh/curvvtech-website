import { Check, Minus } from "lucide-react";
import type { Lead } from "../schemas";
import { computeScoreBreakdown } from "../lead.utils";

type Props = {
  lead: Lead;
  score: number;
};

export function LeadScoreBreakdown({ lead, score }: Props) {
  const factors = computeScoreBreakdown(lead);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold tabular-nums">{score}</span>
        <span className="text-sm text-muted-foreground">/ 100 deal score</span>
      </div>
      <ul className="space-y-2">
        {factors.map((f) => (
          <li key={f.label} className="flex items-center justify-between gap-3 text-sm">
            <span className={f.ok ? "text-foreground" : "text-muted-foreground"}>{f.label}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              {f.ok ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 text-xs font-medium">✓</span>
                </>
              ) : f.partial ? (
                <>
                  <Minus className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 text-xs font-medium">Partial</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Missing</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
