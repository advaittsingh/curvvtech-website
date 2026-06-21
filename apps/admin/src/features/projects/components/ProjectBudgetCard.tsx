import { Pencil } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectRecord } from "../project-schemas";
import { PROJECT_STATUS_LABELS, formatInr, formatShortDate } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  budget: string;
  startDate: string;
  endDate: string;
  onBudget: (v: string) => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  onSave: () => void;
  saving?: boolean;
};

export function ProjectBudgetCard({ project, budget, startDate, endDate, onBudget, onStart, onEnd, onSave, saving }: Props) {
  const [editing, setEditing] = useState(false);
  const status = PROJECT_STATUS_LABELS[project.status ?? "planning"] ?? project.status ?? "Planning";

  if (!editing) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget & timeline</h3>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <ReadRow label="Budget" value={budget ? formatInr(Math.round(Number(budget) * 100)) : formatInr(project.budget_cents)} />
          <ReadRow label="Status" value={status} />
          <ReadRow label="Start date" value={startDate ? formatShortDate(startDate) : project.start_date ? formatShortDate(project.start_date) : "—"} />
          <ReadRow label="Target end" value={endDate ? formatShortDate(endDate) : project.target_end_date ? formatShortDate(project.target_end_date) : "—"} />
        </dl>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit budget & timeline</h3>
      <div><Label>Budget (₹)</Label><Input type="number" value={budget} onChange={(e) => onBudget(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Start</Label><Input type="date" value={startDate} onChange={(e) => onStart(e.target.value)} /></div>
        <div><Label>Target end</Label><Input type="date" value={endDate} onChange={(e) => onEnd(e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-2">
        <Label>Status</Label>
        <Badge variant="secondary">{status}</Badge>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { onSave(); setEditing(false); }} disabled={saving}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
    </div>
  );
}
