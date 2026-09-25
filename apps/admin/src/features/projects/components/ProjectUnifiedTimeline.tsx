import { motion } from "framer-motion";
import { Banknote, Check, Circle, FileText, Flag, Sparkles } from "lucide-react";
import type { ProjectActivity, ProjectInvoice, ProjectMilestone } from "../project-schemas";
import { formatInr, formatShortDate } from "../project-schemas";
import { cn } from "@/lib/utils";

type TimelineEvent = {
  id: string;
  type: "milestone" | "payment" | "activity";
  title: string;
  subtitle?: string;
  date: string;
  done?: boolean;
  active?: boolean;
};

type Props = {
  milestones: ProjectMilestone[];
  invoices: ProjectInvoice[];
  activity: ProjectActivity[];
};

export function ProjectUnifiedTimeline({ milestones, invoices, activity }: Props) {
  const events: TimelineEvent[] = [
    ...milestones.map((m) => ({
      id: `ms-${m.id}`,
      type: "milestone" as const,
      title: m.title ?? "Milestone",
      subtitle: m.completion_pct ? `${m.completion_pct}%` : undefined,
      date: m.completed_at ?? m.due_at ?? "",
      done: Boolean(m.completed_at),
      active: !m.completed_at && m.status === "in_progress",
    })),
    ...invoices
      .filter((i) => i.paid_at)
      .map((i) => ({
        id: `inv-${i.id}`,
        type: "payment" as const,
        title: `Payment · ${formatInr(i.total_cents)}`,
        subtitle: i.invoice_number,
        date: i.paid_at!,
        done: true,
      })),
    ...activity.map((a) => ({
      id: `act-${a.id}`,
      type: "activity" as const,
      title: a.title,
      subtitle: a.description ?? undefined,
      date: a.created_at,
      done: true,
    })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center">
        <p className="text-sm text-muted-foreground">Timeline is empty — add milestones, log payments, or post notes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 max-h-[420px] overflow-y-auto">
      <ol className="relative space-y-0">
        {events.map((e, idx) => (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            {idx < events.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />}
            <span
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                e.done && "border-emerald-500 bg-emerald-500 text-white",
                e.active && "border-primary bg-primary/10 text-primary",
                !e.done && !e.active && "border-muted-foreground/30 bg-background text-muted-foreground",
              )}
            >
              {e.type === "payment" ? <Banknote className="h-3.5 w-3.5" /> : e.type === "milestone" ? e.done ? <Check className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" /> : e.title.includes("AI") ? <Sparkles className="h-3.5 w-3.5" /> : e.title.includes("import") ? <FileText className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{e.title}</p>
              {e.subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.subtitle}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{formatShortDate(e.date)}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
