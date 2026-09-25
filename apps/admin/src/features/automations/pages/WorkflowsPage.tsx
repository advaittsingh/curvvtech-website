import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Sparkles } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/system/ConfirmDialog";
import { CATEGORIES } from "../automations.constants";
import type {
  Workflow,
  WorkflowCategory,
  WorkflowDraft,
  WorkflowRun,
  WorkflowTemplate,
} from "../automations.types";
import {
  computeStats,
  deriveCategory,
  draftToPayload,
  emptyDraft,
  exportWorkflow,
  lastRunByWorkflow,
  runCountByWorkflow,
  templateToDraft,
  workflowSuccessRate,
  workflowToDraft,
} from "../automations.utils";
import { AutomationStatsBar } from "../components/AutomationStatsBar";
import { TemplateGallery } from "../components/TemplateGallery";
import { WorkflowCard } from "../components/WorkflowCard";
import { AutomationsEmptyState } from "../components/AutomationsEmptyState";
import { ExecutionLog } from "../components/ExecutionLog";
import { AutomationAnalytics } from "../components/AutomationAnalytics";
import { WorkflowBuilder } from "../components/WorkflowBuilder";

export default function WorkflowsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<WorkflowDraft | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState<WorkflowCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "workflows"],
    queryFn: () => api.workflows.list(),
  });

  const { data: runsData } = useQuery({
    queryKey: ["admin", "workflows", "runs"],
    queryFn: () => api.workflows.runs(100),
  });

  const workflows: Workflow[] = Array.isArray(data) ? data : [];
  const runs: WorkflowRun[] = Array.isArray(runsData) ? runsData : [];

  const stats = useMemo(() => computeStats(workflows, runs), [workflows, runs]);
  const runCounts = useMemo(() => runCountByWorkflow(runs), [runs]);
  const lastRuns = useMemo(() => lastRunByWorkflow(runs), [runs]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "workflows"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = draftToPayload(draft!);
      return editId ? api.workflows.update(editId, payload) : api.workflows.create(payload);
    },
    onSuccess: () => {
      invalidate();
      setBuilderOpen(false);
      setDraft(null);
      setEditId(null);
      toast({ title: editId ? "Workflow updated" : "Workflow created" });
    },
    onError: (e) => toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.workflows.update(id, { enabled }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.workflows.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast({ title: "Workflow deleted" });
    },
    onError: (e) => toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" }),
  });

  const duplicate = useMutation({
    mutationFn: (wf: Workflow) => {
      const d = workflowToDraft(wf);
      d.name = `${d.name} (copy)`;
      d.enabled = false;
      return api.workflows.create(draftToPayload(d));
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Workflow duplicated" });
    },
  });

  function openCreate() {
    setEditId(null);
    setDraft(emptyDraft());
    setBuilderOpen(true);
  }

  function openTemplate(t: WorkflowTemplate) {
    setEditId(null);
    setDraft(templateToDraft(t));
    setBuilderOpen(true);
  }

  function openEdit(wf: Workflow) {
    setEditId(wf.id);
    setDraft(workflowToDraft(wf));
    setBuilderOpen(true);
  }

  const filtered = workflows.filter((wf) => {
    if (category !== "all" && deriveCategory(wf) !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!wf.name.toLowerCase().includes(q) && !wf.trigger_type.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasWorkflows = workflows.length > 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Automations"
        description="Put your business on autopilot — trigger tasks, projects, invoices, and messages automatically."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowTemplates((s) => !s)}>
              <Sparkles className="h-4 w-4" /> Templates
            </Button>
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New workflow
            </Button>
          </div>
        }
      />

      <BackendErrorAlert error={error} />

      <AutomationStatsBar stats={stats} />

      {(showTemplates || !hasWorkflows) && <TemplateGallery onUse={openTemplate} />}

      {!hasWorkflows && !isLoading ? (
        <AutomationsEmptyState onCreate={openCreate} onBrowseTemplates={() => setShowTemplates(true)} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    category === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search workflows…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No workflows match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  runCount={runCounts[wf.id] ?? 0}
                  successRate={workflowSuccessRate(runs, wf.id)}
                  lastRun={lastRuns[wf.id]}
                  onToggle={(enabled) => toggle.mutate({ id: wf.id, enabled })}
                  onEdit={() => openEdit(wf)}
                  onDuplicate={() => duplicate.mutate(wf)}
                  onExport={() => exportWorkflow(wf)}
                  onDelete={() => setDeleteId(wf.id)}
                  onRunTest={() =>
                    toast({
                      title: "Live triggers only",
                      description: `"${wf.name}" runs automatically when its trigger fires on real data.`,
                    })
                  }
                />
              ))}
            </div>
          )}

          {/* Analytics + Log */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AutomationAnalytics runs={runs} stats={stats} />
            <ExecutionLog runs={runs.slice(0, 8)} />
          </div>
        </>
      )}

      <WorkflowBuilder
        open={builderOpen}
        onOpenChange={(o) => {
          setBuilderOpen(o);
          if (!o) {
            setDraft(null);
            setEditId(null);
          }
        }}
        draft={draft}
        onChange={setDraft}
        onSave={() => save.mutate()}
        saving={save.isPending}
        isEdit={Boolean(editId)}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete workflow?"
        description="This permanently removes the workflow and stops it from running. This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}
