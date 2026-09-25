import { motion } from "framer-motion";
import {
  Bot,
  Calendar,
  CheckCircle2,
  FileText,
  MessageCircle,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ManagerBrief } from "../project-schemas";
import { formatInr } from "../project-schemas";

type Props = {
  brief: ManagerBrief | null | undefined;
  loading?: boolean;
  error?: boolean;
  fallback?: boolean;
  onAction?: (actionId: string) => void;
  onRetry?: () => void;
};

const ACTION_ICONS: Record<string, typeof Bot> = {
  invoice: FileText,
  meeting: Calendar,
  followup: MessageCircle,
  deploy: Rocket,
  milestone: CheckCircle2,
  task: CheckCircle2,
  plan: Sparkles,
};

export function ProjectAIManager({ brief, loading, error, fallback, onAction, onRetry }: Props) {
  if (loading && !brief) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5 min-h-[200px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading project insights…
        </div>
      </div>
    );
  }

  if (error && !brief) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 p-5 min-h-[160px] flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium">Couldn&apos;t load AI project manager</p>
        <p className="text-xs text-muted-foreground">Summary data failed to load from the server.</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 min-h-[160px] flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">No project insights yet.</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
            <Sparkles className="h-3.5 w-3.5" /> Generate insights
          </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between gap-2 bg-primary/[0.04]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm">AI Project Manager</h2>
            <p className="text-xs text-muted-foreground truncate">{brief.greeting}</p>
          </div>
        </div>
        {fallback && (
          <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">Offline summary</span>
        )}
      </div>

      <div className="p-4 grid lg:grid-cols-[1fr_240px] gap-4">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Today&apos;s summary</p>
            <ul className="space-y-1.5">
              {brief.summary_lines.map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="text-sm flex gap-2 leading-snug"
                >
                  <span className="text-primary shrink-0">•</span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {brief.priorities.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Today&apos;s priorities</p>
              <ul className="space-y-1">
                {brief.priorities.map((p, i) => (
                  <li key={i} className="text-sm font-medium flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
            {brief.outstanding_cents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-amber-700">{formatInr(brief.outstanding_cents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. completion</span>
              <span className="font-semibold">{brief.estimated_completion}</span>
            </div>
            {brief.awaiting.length > 0 && (
              <div className="pt-1 border-t border-border/60">
                <p className="text-muted-foreground mb-1">Awaiting</p>
                {brief.awaiting.map((a, i) => (
                  <p key={i} className="font-medium">{a}</p>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Suggested actions</p>
            <div className="space-y-1.5">
              {brief.suggested_actions.map((action) => {
                const Icon = ACTION_ICONS[action.type] ?? CheckCircle2;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs font-normal hover:bg-primary/5 hover:border-primary/30"
                    onClick={() => onAction?.(action.id)}
                  >
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
