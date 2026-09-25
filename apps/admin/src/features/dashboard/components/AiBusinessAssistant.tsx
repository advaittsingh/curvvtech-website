import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardOverview } from "../dashboard.types";
import { formatCompactInr, formatInr, greetingName, timeGreeting } from "../dashboard.utils";
import { DashboardCard } from "./DashboardCard";

type Props = {
  data?: DashboardOverview;
  userEmail?: string | null;
  isLoading?: boolean;
};

export function AiBusinessAssistant({ data, userEmail, isLoading }: Props) {
  const [expanded, setExpanded] = useState(true);
  const ai = data?.ai_assistant;
  const summary = ai?.daily_summary;
  const suggestionCount = (ai?.suggested_actions ?? []).length + (ai?.today_priorities ?? []).length;

  return (
    <DashboardCard className="bg-gradient-to-br from-primary/5 via-card to-violet-500/5 border-primary/15 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 mb-1 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary p-2.5 shadow-sm group-hover:shadow-md transition-shadow">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold">AI Business Assistant</h3>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {!expanded && suggestionCount > 0 && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {suggestionCount} suggestions
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeGreeting()}, {greetingName(userEmail)} — your command center
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isLoading ? (
        <div className="space-y-2 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                <SectionDivider label="Today's summary" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <SummaryItem label="Revenue" value={formatInr(summary?.revenue_today_cents ?? 0)} />
                  <SummaryItem
                    label="Collections due"
                    value={formatCompactInr(summary?.collections_due_cents ?? 0)}
                    sub={summary?.collections_due_client ?? undefined}
                  />
                  <SummaryItem label="Active projects" value={String(summary?.active_projects ?? 0)} />
                  <SummaryItem label="Profit this month" value={formatCompactInr(summary?.profit_month_cents ?? 0)} />
                  <SummaryItem
                    label="Pipeline"
                    value={
                      (data?.pipeline?.open_leads ?? 0) > 0
                        ? formatCompactInr(summary?.pipeline_value_cents ?? 0)
                        : "—"
                    }
                    sub={
                      data?.pipeline?.open_leads
                        ? `${data.pipeline.open_leads} open lead${data.pipeline.open_leads === 1 ? "" : "s"}`
                        : undefined
                    }
                  />
                </div>

                {(ai?.project_highlights ?? []).length > 0 && (
                  <>
                    <SectionDivider label="Projects" />
                    <ul className="space-y-1.5">
                      {ai?.project_highlights.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={p.href}
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
                          >
                            <span className="text-emerald-600">✓</span>
                            <span className="group-hover:underline truncate">
                              {p.name}
                              {p.client_name && (
                                <span className="text-muted-foreground font-normal"> · {p.client_name}</span>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{p.progress_pct}%</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <SectionDivider label="Today's priorities" />
                <ul className="space-y-1.5">
                  {(ai?.today_priorities ?? []).length === 0 ? (
                    <li className="text-sm text-muted-foreground">No urgent priorities — great day to plan ahead.</li>
                  ) : (
                    ai?.today_priorities.map((p, i) => (
                      <li key={p.href + p.label}>
                        <Link to={p.href} className="flex items-start gap-2 text-sm hover:text-primary transition-colors group">
                          <span className="text-primary font-semibold text-xs mt-0.5">{i + 1}.</span>
                          <span className="group-hover:underline">{p.label}</span>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>

                {(ai?.insights ?? []).length > 0 && (
                  <>
                    <SectionDivider label="Business insights" />
                    <ul className="space-y-1">
                      {ai?.insights.map((ins, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                          {ins.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" />}
                          {ins.trend === "down" && <TrendingDown className="h-3 w-3 text-amber-600 shrink-0" />}
                          {ins.trend === "neutral" && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />}
                          {ins.label}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {ai?.recommendation && (
                  <>
                    <SectionDivider label="Recommendation" />
                    <div className="flex gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">{ai.recommendation}</p>
                    </div>
                  </>
                )}

                <SectionDivider label="Recommended actions" />
                <div className="flex flex-wrap gap-1.5">
                  {(ai?.suggested_actions ?? []).map((a) => (
                    <Button key={a.href + a.label} variant="secondary" size="sm" asChild className="h-8 text-xs">
                      <Link to={a.href}>{a.label}</Link>
                    </Button>
                  ))}
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Button asChild className="w-full sm:w-auto" size="sm">
                    <Link to="/inbox">Open Inbox</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </DashboardCard>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function SummaryItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-background/60 border border-border/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sub}</p>}
    </div>
  );
}
