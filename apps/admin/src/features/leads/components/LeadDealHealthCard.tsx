import { Bot, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { Lead, LeadAiInsights } from "../schemas";
import { computeDealHealth, renderStars } from "../lead.utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  lead: Lead;
  score: number;
  aiInsights?: LeadAiInsights | null;
  onRecommendedAction?: () => void;
  onOpenAi?: () => void;
};

export function LeadDealHealthCard({ lead, score, aiInsights, onRecommendedAction, onOpenAi }: Props) {
  const health = computeDealHealth(lead, score, aiInsights);

  const riskColor =
    health.risk === "Low"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : health.risk === "Medium"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden">
      <div className="p-5 lg:p-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deal health</h2>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-bold tabular-nums">{health.healthPct}%</span>
              <span className="text-xl text-amber-500 tracking-widest" aria-label={`${health.stars} of 5 stars`}>
                {renderStars(health.stars)}
              </span>
            </div>
          </div>
          {onOpenAi && (
            <Button size="sm" className="gap-1.5 shrink-0" onClick={onOpenAi}>
              <Bot className="h-4 w-4" />
              AI Assistant
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Metric label="Probability" value={`${health.probability}%`} />
          <Metric label="Budget match" value={`${health.budgetMatchPct}%`} />
          <Metric label="Engagement" value={health.engagement} />
          <Metric label="Decision maker" value={health.decisionMaker} />
          <Metric label="Risk">
            <Badge variant="outline" className={riskColor}>
              {health.risk}
            </Badge>
          </Metric>
          <Metric label="Expected close" value={health.expectedCloseLabel} />
        </div>

        <div className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI says</p>
          <p className="text-sm leading-relaxed">{health.aiSummary}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-border/60">
            <span className="text-xs text-muted-foreground shrink-0">Recommended next action:</span>
            <Button
              variant="secondary"
              size="sm"
              className="justify-start font-medium"
              onClick={onRecommendedAction}
            >
              {health.recommendedAction}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="mt-1 text-sm font-semibold">{children ?? value}</div>
    </div>
  );
}
