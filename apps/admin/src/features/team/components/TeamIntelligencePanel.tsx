import { Sparkles } from "lucide-react";
import type { TeamAiInsight } from "../team-schemas";

export function TeamIntelligencePanel({ insight }: { insight: TeamAiInsight | undefined }) {
  const ai = insight;
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50/80 to-card dark:from-blue-950/20 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <p className="text-sm font-semibold">AI team insights</p>
      </div>
      <p className="text-sm">{ai?.insight ?? "Loading insights…"}</p>
      <div className="mt-3 space-y-1.5 text-sm">
        {ai?.most_productive_name && (
          <p>
            Most productive: <span className="font-semibold">{ai.most_productive_name}</span>
          </p>
        )}
        {ai?.overloaded_name && (
          <p>
            Overloaded: <span className="font-semibold text-amber-700">{ai.overloaded_name}</span>
          </p>
        )}
        {ai?.idle_name && (
          <p>
            Available capacity: <span className="font-semibold text-emerald-700">{ai.idle_name}</span>
          </p>
        )}
      </div>
      {ai?.recommended_action && (
        <p className="text-xs text-muted-foreground mt-3 border-t border-border/60 pt-2">
          Recommendation: {ai.recommended_action}
        </p>
      )}
    </div>
  );
}
