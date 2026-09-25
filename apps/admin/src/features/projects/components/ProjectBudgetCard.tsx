import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectRecord, ProjectSummary } from "../project-schemas";
import { PROJECT_STATUS_LABELS, formatInr } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  summary?: ProjectSummary | null;
  onPatch: (body: object) => void;
};

function centsToRupee(cents: number | null | undefined) {
  if (cents == null) return "";
  return String(Number(cents) / 100);
}

function rupeeToCents(v: string) {
  if (!v.trim()) return null;
  return Math.round(Number(v) * 100);
}

export function ProjectBudgetCard({ project, summary, onPatch }: Props) {
  const collected = summary?.collected_cents ?? project.collected_cents ?? 0;
  const pending = summary?.pending_cents ?? project.pending_cents ?? 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget & financials</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Budget (₹)">
          <Input
            type="number"
            min={0}
            defaultValue={centsToRupee(project.budget_cents)}
            key={`budget-${project.id}-${project.budget_cents}`}
            onBlur={(e) => {
              const cents = rupeeToCents(e.target.value);
              if (cents !== project.budget_cents) onPatch({ budget_cents: cents });
            }}
          />
        </Field>
        <Field label="Quoted value (₹)">
          <Input
            type="number"
            min={0}
            defaultValue={centsToRupee(project.quoted_cents)}
            key={`quoted-${project.id}-${project.quoted_cents}`}
            onBlur={(e) => {
              const cents = rupeeToCents(e.target.value);
              if (cents !== project.quoted_cents) onPatch({ quoted_cents: cents });
            }}
          />
        </Field>
        <Field label="GST (₹)">
          <Input
            type="number"
            min={0}
            defaultValue={centsToRupee(project.gst_cents)}
            key={`gst-${project.id}-${project.gst_cents}`}
            onBlur={(e) => {
              const cents = rupeeToCents(e.target.value);
              if (cents !== project.gst_cents) onPatch({ gst_cents: cents });
            }}
          />
        </Field>
        <Field label="Status">
          <Select value={project.status ?? "planning"} onValueChange={(v) => onPatch({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Start date">
          <Input
            type="date"
            defaultValue={project.start_date ? String(project.start_date).slice(0, 10) : ""}
            key={`start-${project.id}-${project.start_date}`}
            onBlur={(e) => {
              const v = e.target.value || null;
              const prev = project.start_date ? String(project.start_date).slice(0, 10) : null;
              if (v !== prev) onPatch({ start_date: v });
            }}
          />
        </Field>
        <Field label="Target end">
          <Input
            type="date"
            defaultValue={project.target_end_date ? String(project.target_end_date).slice(0, 10) : ""}
            key={`end-${project.id}-${project.target_end_date}`}
            onBlur={(e) => {
              const v = e.target.value || null;
              const prev = project.target_end_date ? String(project.target_end_date).slice(0, 10) : null;
              if (v !== prev) onPatch({ target_end_date: v });
            }}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Received</p>
          <p className="text-lg font-semibold text-emerald-700">{formatInr(collected)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">From paid invoices</p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</p>
          <p className="text-lg font-semibold text-amber-800">{formatInr(pending)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Budget minus collected</p>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
