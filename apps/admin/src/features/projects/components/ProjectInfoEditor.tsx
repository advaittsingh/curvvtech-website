import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectRecord } from "../project-schemas";
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS } from "../project-schemas";

type Props = {
  project: ProjectRecord;
  onPatch: (body: object) => void;
};

export function ProjectInfoEditor({ project, onPatch }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project details</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Project type">
          <Input
            defaultValue={project.project_type ?? ""}
            key={`ptype-${project.id}-${project.project_type}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (project.project_type ?? "")) onPatch({ project_type: v || null });
            }}
          />
        </Field>
        <Field label="Status">
          <Select value={project.status ?? "active"} onValueChange={(v) => onPatch({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={project.priority ?? "medium"} onValueChange={(v) => onPatch({ priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Progress %">
          <Input
            type="number"
            min={0}
            max={100}
            defaultValue={project.progress_pct ?? 0}
            key={`progress-${project.id}-${project.progress_pct}`}
            onBlur={(e) => {
              const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              if (v !== (project.progress_pct ?? 0)) onPatch({ progress_pct: v });
            }}
          />
        </Field>
        <Field label="Current phase">
          <Input
            defaultValue={project.current_phase ?? ""}
            key={`phase-${project.id}-${project.current_phase}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (project.current_phase ?? "")) onPatch({ current_phase: v || null });
            }}
            placeholder="e.g. Development"
          />
        </Field>
        <Field label="Live URL">
          <Input
            defaultValue={project.live_url ?? ""}
            key={`live-${project.id}-${project.live_url}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (project.live_url ?? "")) onPatch({ live_url: v || null });
            }}
            placeholder="https://"
          />
        </Field>
        <Field label="Repository">
          <Input
            defaultValue={project.repository_url ?? ""}
            key={`repo-${project.id}-${project.repository_url}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (project.repository_url ?? "")) onPatch({ repository_url: v || null });
            }}
            placeholder="GitHub URL"
          />
        </Field>
        <Field label="Figma">
          <Input
            defaultValue={project.figma_url ?? ""}
            key={`figma-${project.id}-${project.figma_url}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (project.figma_url ?? "")) onPatch({ figma_url: v || null });
            }}
            placeholder="Figma link"
          />
        </Field>
        <Field label="Referred by">
          <Input
            defaultValue={project.referred_by ?? ""}
            key={`ref-${project.id}-${project.referred_by}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (project.referred_by ?? "")) onPatch({ referred_by: v || null });
            }}
          />
        </Field>
        <Field label="Color" className="sm:col-span-2">
          <div className="flex gap-2 items-center">
            <Input
              type="color"
              defaultValue={project.color ?? "#6366f1"}
              key={`color-pick-${project.id}-${project.color}`}
              onChange={(e) => onPatch({ color: e.target.value })}
              className="w-14 h-9 p-1"
            />
            <Input
              defaultValue={project.color ?? "#6366f1"}
              key={`color-${project.id}-${project.color}`}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (project.color ?? "#6366f1")) onPatch({ color: v || null });
              }}
              className="flex-1"
            />
          </div>
        </Field>
        <Field label="Tags" className="sm:col-span-2">
          <Input
            defaultValue={(project.tags ?? []).join(", ")}
            key={`tags-${project.id}-${(project.tags ?? []).join(",")}`}
            onBlur={(e) => {
              const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
              const prev = (project.tags ?? []).join(", ");
              if (e.target.value.trim() !== prev) onPatch({ tags });
            }}
            placeholder="ai, shopify, historical"
          />
        </Field>
        <Field label="Internal notes" className="sm:col-span-2">
          <Textarea
            rows={4}
            defaultValue={project.internal_notes ?? ""}
            key={`notes-${project.id}-${project.internal_notes}`}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (project.internal_notes ?? "")) onPatch({ internal_notes: v || null });
            }}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
