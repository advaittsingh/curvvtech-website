import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolesAiInsight } from "../../roles-schemas";

export function RolesSecurityPanel({ insight }: { insight: RolesAiInsight | undefined }) {
  const ai = insight;
  const risk = ai?.risk_level ?? "low";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        risk === "high"
          ? "border-red-200 bg-gradient-to-br from-red-50/80 to-card dark:from-red-950/20"
          : risk === "medium"
            ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-card dark:from-amber-950/20"
            : "border-border bg-gradient-to-br from-emerald-50/60 to-card dark:from-emerald-950/20",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <p className="text-sm font-semibold">AI security review</p>
      </div>
      <p className="text-sm">{ai?.insight ?? "Analyzing role permissions…"}</p>
      {ai?.recommended_action && (
        <p className="text-xs text-muted-foreground mt-3 border-t border-border/60 pt-2">
          Recommendation: {ai.recommended_action}
        </p>
      )}
    </div>
  );
}
