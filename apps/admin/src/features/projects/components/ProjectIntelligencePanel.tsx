import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProjectIntelligence } from "../project-schemas";

type Props = { intel: ProjectIntelligence; loading?: boolean; compact?: boolean };

function healthEmoji(v?: string) {
  const l = (v ?? "").toLowerCase();
  if (l.includes("good") || l.includes("healthy")) return "🟢";
  if (l.includes("fair") || l.includes("medium")) return "🟡";
  return "🔴";
}

function riskEmoji(v?: string) {
  const l = (v ?? "").toLowerCase();
  if (l.includes("low")) return "🟢";
  if (l.includes("medium")) return "🟡";
  return "🔴";
}

export function ProjectIntelligencePanel({ intel, loading, compact }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 animate-pulse">
        <p className="text-xs text-muted-foreground">Analyzing project…</p>
      </div>
    );
  }

  return (
    <div className={compact ? "rounded-xl border border-border bg-card p-3 space-y-3" : "rounded-xl border border-border bg-card p-4 space-y-4"}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI insights</h3>
        {intel.confidence_percent != null && (
          <Badge variant="outline" className="text-[10px] ml-auto h-5">{intel.confidence_percent}%</Badge>
        )}
      </div>

      <div className="space-y-3">
        <InsightRow emoji={healthEmoji(intel.project_health)} label="Project health" value={intel.project_health ?? "Healthy"} />
        <InsightRow emoji={riskEmoji(intel.timeline_risk)} label="Timeline risk" value={intel.timeline_risk ?? "Low"} />
        <InsightRow emoji={riskEmoji(intel.budget_risk)} label="Budget risk" value={intel.budget_risk ?? "Low"} />
      </div>

      <div className="border-t border-border pt-3 space-y-2.5 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Current bottleneck</p>
          <p className="font-medium leading-snug">{intel.current_bottleneck ?? "None identified"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Recommended action</p>
          <p className="font-medium leading-snug">{intel.recommended_action ?? "Continue current sprint"}</p>
        </div>
      </div>

      {intel.ai_summary && (
        <div className="rounded-lg bg-muted/40 p-2.5 text-sm leading-relaxed whitespace-pre-line">
          {intel.ai_summary}
        </div>
      )}
    </div>
  );
}

function InsightRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold mt-0.5 flex items-center gap-1.5">
        <span>{emoji}</span>
        <span>{value}</span>
      </p>
    </div>
  );
}
