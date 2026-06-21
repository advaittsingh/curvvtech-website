import type { DemoIntelligence, InboundOpportunity } from "../demo-schemas";
import { formatScore100, resolveIntel } from "../demo-schemas";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles } from "lucide-react";

type Props = {
  row: InboundOpportunity;
  loading?: boolean;
};

export function DemoIntelligencePanel({ row, loading }: Props) {
  const data = resolveIntel(row);

  if (loading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-pulse">
        <p className="text-sm text-muted-foreground">Analyzing with AI… scoring opportunity, estimating value, and drafting summary.</p>
      </div>
    );
  }

  const scoreLabel = formatScore100(row);
  const closeProb = row.close_probability ?? data.close_probability;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/20 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Lead intelligence</h3>
          </div>
          {data.confidence_percent != null && (
            <Badge variant="outline" className="text-xs">{data.confidence_percent}% confidence</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <IntelStat label="Lead score" value={scoreLabel} highlight />
          <IntelStat label="Potential value" value={data.potential_value_label ?? data.estimated_budget_label ?? "₹80K – ₹1.2L"} />
          <IntelStat label="Complexity" value={data.project_complexity ?? "Medium"} />
          <IntelStat label="Close probability" value={closeProb != null ? `${closeProb}%` : `${data.close_probability ?? 45}%`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-border/60 pt-3">
          <Mini label="Business type" value={data.business_type ?? "—"} />
          <Mini label="Project" value={data.project_type ?? data.recommended_solution ?? "—"} />
          <Mini label="Budget" value={data.estimated_budget_label ?? data.budget_range ?? "—"} />
          <Mini label="Urgency" value={data.urgency ?? "Medium"} />
        </div>

        {(data.recommended_services?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recommended services</p>
            <div className="flex flex-wrap gap-1.5">
              {data.recommended_services!.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {data.recommended_proposal && (
          <p className="text-sm">
            <span className="text-muted-foreground">Recommended package: </span>
            <span className="font-medium">{data.recommended_proposal}</span>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" /> AI summary
        </h3>
        <p className="text-sm leading-relaxed">{data.ai_summary}</p>
        {(data.upsells?.length ?? 0) > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Potential upsells</p>
            <ul className="text-sm space-y-1">
              {data.upsells!.slice(0, 4).map((u) => (
                <li key={u} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function IntelStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={highlight ? "text-xl font-bold text-primary" : "font-semibold"}>{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium truncate" title={value}>{value}</p>
    </div>
  );
}
