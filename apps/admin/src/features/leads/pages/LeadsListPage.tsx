import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronRight, Filter, Plus, LayoutGrid, List, Sparkles, Phone, Mail, MessageCircle, FileSignature, Calendar, Archive, Trash2 } from "lucide-react";
import { useLeads, useLeadMutations, usePipelineSummary } from "../hooks/useLeads";
import type { Lead, LeadFilters, PipelineSummary } from "../schemas";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  formatInr,
  formatRelativeDays,
  scoreTier,
  scoreTierColor,
  scoreTierLabel,
} from "../constants";
import { DataTable, ConfirmDialog, KanbanBoard, type ColumnDef } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickLeadSchema, type QuickLeadFormValues } from "../schemas";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";

const columns: ColumnDef<Lead>[] = [
  {
    id: "name",
    header: "Lead name",
    sortValue: (r) => r.name ?? "",
    cell: (r) => <span className="font-medium">{r.name ?? r.email ?? "—"}</span>,
  },
  {
    id: "company",
    header: "Company",
    sortValue: (r) => r.company ?? "",
    cell: (r) => r.company ?? "—",
  },
  {
    id: "deal",
    header: "Value",
    sortValue: (r) => r.deal_value_cents ?? 0,
    cell: (r) => formatInr(r.deal_value_cents),
  },
  {
    id: "owner",
    header: "Owner",
    sortValue: (r) => r.assigned_to_clerk_id ?? "",
    cell: (r) => <span className="text-muted-foreground">—</span>,
  },
  {
    id: "status",
    header: "Stage",
    sortValue: (r) => r.status ?? "",
    cell: (r) => {
      const st = String(r.status ?? "new") as keyof typeof LEAD_STATUS_LABELS;
      return (
        <Badge variant="outline" className={LEAD_STATUS_COLORS[st] ?? ""}>
          {LEAD_STATUS_LABELS[st] ?? r.status}
        </Badge>
      );
    },
  },
  {
    id: "probability",
    header: "Probability",
    sortValue: (r) => r.probability ?? 0,
    cell: (r) => <span className="text-sm tabular-nums">{r.probability ?? 0}%</span>,
  },
  {
    id: "source",
    header: "Source",
    sortValue: (r) => r.source ?? "",
    cell: (r) => (
      <span className="text-sm text-muted-foreground">
        {LEAD_SOURCE_LABELS[String(r.source ?? "manual")] ?? r.source ?? "—"}
      </span>
    ),
  },
  {
    id: "priority",
    header: "Priority",
    sortValue: (r) => r.priority ?? "",
    cell: (r) => (
      <Badge variant="outline" className="capitalize text-xs">
        {r.priority ?? "medium"}
      </Badge>
    ),
  },
  {
    id: "created",
    header: "Created",
    sortValue: (r) => r.createdAt ?? "",
    cell: (r) => (
      <span className="text-muted-foreground text-sm">
        {r.createdAt ? formatRelativeDays(r.createdAt) : "—"}
      </span>
    ),
  },
  {
    id: "next_follow_up",
    header: "Next follow-up",
    sortValue: (r) => r.next_follow_up_at ?? "",
    cell: (r) => (
      <span className="text-muted-foreground text-sm">
        {r.next_follow_up_at ? formatRelativeDays(r.next_follow_up_at) : "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: () => (
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    ),
  },
];

function buildTableColumns(memberMap: Map<string, string>, onDelete: (id: string) => void): ColumnDef<Lead>[] {
  return columns.map((col) => {
    if (col.id === "owner") {
      return {
        ...col,
        sortValue: (r) => assigneeLabel(memberMap, r.assigned_to_clerk_id),
        cell: (r) => (
          <span className="text-sm">{assigneeLabel(memberMap, r.assigned_to_clerk_id)}</span>
        ),
      };
    }
    if (col.id === "actions") {
      return {
        ...col,
        cell: (r) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
              aria-label={`Delete ${r.name ?? r.company ?? "lead"}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(r.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        ),
      };
    }
    return col;
  });
}

function assigneeLabel(memberMap: Map<string, string>, id?: string | null): string {
  if (!id) return "Unassigned";
  const email = memberMap.get(id);
  if (!email) return "Assigned";
  return email.split("@")[0]?.replace(/[._]/g, " ") ?? email;
}

function LeadCard({
  lead,
  memberMap,
  onQuickAction,
}: {
  lead: Lead;
  memberMap: Map<string, string>;
  onQuickAction?: (action: string, lead: Lead) => void;
}) {
  const st = String(lead.status ?? "new") as keyof typeof LEAD_STATUS_COLORS;
  const score = lead.score ?? 0;
  const tier = scoreTier(score);
  const lastContact = lead.last_contacted_at ?? lead.updatedAt;
  const daysInStage = lead.updatedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000))
    : 0;
  const probability = lead.probability ?? 0;

  return (
    <div className="relative group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-tight">{lead.company ?? lead.name ?? "Lead"}</p>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${scoreTierColor(tier)}`}>
          {tier === "hot" ? "🔥 " : ""}{scoreTierLabel(tier)}
        </Badge>
      </div>
      {lead.project_type && <p className="text-xs text-muted-foreground">{lead.project_type}</p>}
      {lead.deal_value_cents ? (
        <p className="text-sm font-bold">{formatInr(lead.deal_value_cents)}</p>
      ) : lead.budget ? (
        <p className="text-sm text-muted-foreground">{lead.budget}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 text-[11px]">
        {probability > 0 && (
          <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 font-medium">{probability}%</span>
        )}
        <span className="text-muted-foreground">{daysInStage}d in stage</span>
      </div>
      <div className="pt-1 space-y-1 text-[11px] text-muted-foreground border-t border-border/60">
        <p><span className="text-foreground/70">Assigned:</span> {assigneeLabel(memberMap, lead.assigned_to_clerk_id)}</p>
        <p><span className="text-foreground/70">Last contact:</span> {formatRelativeDays(lastContact)}</p>
      </div>
      <Badge variant="outline" className={`text-[10px] ${LEAD_STATUS_COLORS[st] ?? ""}`}>
        {LEAD_STATUS_LABELS[st] ?? lead.status}
      </Badge>

      {onQuickAction && (
        <div
          className="absolute inset-0 rounded-lg bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Quick actions</p>
          <div className="flex flex-wrap justify-center gap-1">
            {lead.phone && (
              <Button size="icon" variant="secondary" className="h-8 w-8" title="Call" onClick={() => onQuickAction("call", lead)}>
                <Phone className="h-3.5 w-3.5" />
              </Button>
            )}
            {lead.phone && (
              <Button size="icon" variant="secondary" className="h-8 w-8" title="WhatsApp" onClick={() => onQuickAction("whatsapp", lead)}>
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {lead.email && (
              <Button size="icon" variant="secondary" className="h-8 w-8" title="Email" onClick={() => onQuickAction("email", lead)}>
                <Mail className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="secondary" className="h-8 w-8" title="Proposal" onClick={() => onQuickAction("proposal", lead)}>
              <FileSignature className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" title="Schedule" onClick={() => onQuickAction("schedule", lead)}>
              <Calendar className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" title="Archive" onClick={() => onQuickAction("archive", lead)}>
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-2 truncate">{value}</p>
    </div>
  );
}

function PipelineInsightsSidebar({ list, pipelineValueCents }: { list: Lead[]; pipelineValueCents: number }) {
  const needsFollowUp = list.filter((l) => {
    if (["won", "lost"].includes(String(l.status))) return false;
    const ref = l.last_contacted_at ?? l.updatedAt;
    if (!ref) return true;
    const days = (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 5;
  }).length;

  const proposalsPending = list.filter((l) => l.status === "proposal_sent").length;

  return (
    <aside className="hidden 2xl:block w-[280px] shrink-0">
      <div className="rounded-xl border border-border bg-card p-5 sticky top-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Pipeline insights</h3>
            <p className="text-xs text-muted-foreground">Sales assistant</p>
          </div>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-2">
            <Bot className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <span>{needsFollowUp} lead{needsFollowUp === 1 ? "" : "s"} need follow-up</span>
          </li>
          <li className="flex gap-2">
            <Bot className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <span>{proposalsPending} proposal{proposalsPending === 1 ? "" : "s"} pending response</span>
          </li>
          <li className="flex gap-2">
            <Bot className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <span>Pipeline value {formatInr(pipelineValueCents)}</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default function LeadsListPage() {
  const navigate = useNavigate();
  const api = useAdminApi();
  const { toast } = useToast();
  const [filters, setFilters] = useState<LeadFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading, error } = useLeads(filters);
  const { data: summary, error: summaryError } = usePipelineSummary();
  const { create, update, remove, markLost } = useLeadMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [view, setView] = useState<"table" | "kanban">("table");

  const { data: members } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });

  const memberMap = useMemo(
    () =>
      new Map(
        (Array.isArray(members) ? members : []).map((m: { user_id: string; email: string }) => [m.user_id, m.email]),
      ),
    [members],
  );

  const list: Lead[] = Array.isArray(data) ? data : [];

  const activeLeadCount = useMemo(
    () => list.filter((l) => !["won", "lost"].includes(String(l.status ?? ""))).length,
    [list],
  );

  const pipelineMetrics = useMemo((): PipelineSummary => {
    const s =
      summary && typeof summary === "object" && !("error" in summary)
        ? (summary as PipelineSummary)
        : null;
    const pipelineFromList = list
      .filter((l) => !["won", "lost"].includes(String(l.status ?? "")))
      .reduce((sum, l) => sum + (l.deal_value_cents ?? 0), 0);
    return {
      total_leads: s?.total_leads ?? activeLeadCount,
      pipeline_value_cents: s?.pipeline_value_cents ?? pipelineFromList,
      won_this_month_cents: s?.won_this_month_cents ?? 0,
      conversion_rate_pct: s?.conversion_rate_pct ?? 0,
    };
  }, [summary, activeLeadCount, list]);

  const form = useForm<QuickLeadFormValues>({
    resolver: zodResolver(quickLeadSchema),
    defaultValues: { name: "", company: "", email: "", phone: "" },
  });

  async function onQuickCreate(values: QuickLeadFormValues) {
    const created = (await create.mutateAsync({
      ...values,
      status: "new",
      source: "manual",
      priority: "medium",
    })) as Lead;
    setCreateOpen(false);
    form.reset({ name: "", company: "", email: "", phone: "" });
    if (created?.id) navigate(`/leads/${created.id}`);
  }

  const tableColumns = useMemo(() => buildTableColumns(memberMap, (id) => {
    const lead = list.find((l) => l.id === id);
    if (lead) setDeleteTarget(lead);
  }), [memberMap, list]);

  const kanbanColumns = LEAD_STATUSES.filter((s) => s !== "lost").map((status) => ({
    id: status,
    title: LEAD_STATUS_LABELS[status],
    items: list.filter((l) => (l.status ?? "new") === status),
  }));

  function handleKanbanQuickAction(action: string, lead: Lead) {
    if (action === "call" && lead.phone) {
      window.open(`tel:${lead.phone}`, "_self");
      return;
    }
    if (action === "whatsapp" && lead.phone) {
      const digits = lead.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${digits}`, "_blank");
      return;
    }
    if (action === "email" && lead.email) {
      window.open(`mailto:${lead.email}`, "_self");
      return;
    }
    if (action === "proposal" || action === "schedule") {
      navigate(`/leads/${lead.id}`);
      return;
    }
    if (action === "archive") {
      markLost.mutate(lead.id);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[100vw] overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline management — open a lead to work the deal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="h-4 w-4 mr-1" /> Filters
          </Button>
          <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
            <TabsList>
              <TabsTrigger value="table" className="gap-1"><List className="h-3.5 w-3.5" /> Table</TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Board</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New lead
          </Button>
        </div>
      </div>

      <BackendErrorAlert error={error ?? summaryError} />

      {/* KPI grid — full width, no horizontal scroll */}
      <section aria-label="Pipeline metrics" className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
          <KpiCard label="Open pipeline" value={String(pipelineMetrics.total_leads)} />
          <KpiCard label="Pipeline value" value={formatInr(pipelineMetrics.pipeline_value_cents)} />
          <KpiCard label="Won this month" value={formatInr(pipelineMetrics.won_this_month_cents)} />
          <KpiCard label="Conversion rate" value={`${pipelineMetrics.conversion_rate_pct}%`} />
        </div>
      </section>

      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 w-full">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Assigned to</Label>
            <Select value={filters.assigned_to ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, assigned_to: v === "all" ? undefined : v }))}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(Array.isArray(members) ? members : []).map((m: { user_id: string; email: string }) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={filters.priority ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? undefined : v }))}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEAD_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={filters.source ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, source: v === "all" ? undefined : v }))}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s] ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Service type</Label>
            <Input placeholder="Website, app…" value={filters.project_type ?? ""} onChange={(e) => setFilters((f) => ({ ...f, project_type: e.target.value || undefined }))} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Clear filters</Button>
          </div>
        </div>
      )}

      {/* Main area — no horizontal page scroll on desktop */}
      <div className="flex gap-6 items-start w-full min-w-0 overflow-x-hidden">
        <div className="flex-1 min-w-0 overflow-x-hidden">
          {view === "kanban" ? (
            <KanbanBoard
              columns={kanbanColumns}
              desktopColumns={6}
              onMove={(id, toStatus) => update.mutate({ id, body: { status: toStatus } })}
              onCardClick={(lead) => navigate(`/leads/${lead.id}`)}
              renderCard={(lead) => (
                <LeadCard lead={lead} memberMap={memberMap} onQuickAction={handleKanbanQuickAction} />
              )}
            />
          ) : (
            <DataTable
              columns={tableColumns}
              data={list}
              isLoading={isLoading}
              exportable
              exportFileName="leads.csv"
              onRowClick={(row) => navigate(`/leads/${row.id}`)}
              emptyTitle="No leads yet"
              emptyDescription="Capture a lead in seconds — we'll take you to the workspace."
              emptyCta={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Quick add lead
                </Button>
              }
            />
          )}
        </div>
        <PipelineInsightsSidebar list={list} pipelineValueCents={pipelineMetrics.pipeline_value_cents} />
      </div>

      {/* Quick lead capture — HubSpot style */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick lead capture</DialogTitle>
            <DialogDescription>
              Add the basics now. Complete budget, source, and requirements on the lead workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onQuickCreate)} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input {...form.register("name")} autoFocus placeholder="Advait Singh" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label>Company</Label>
              <Input {...form.register("company")} placeholder="Masako India" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} placeholder="hello@company.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...form.register("phone")} placeholder="+91…" />
              </div>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              {create.isPending ? "Creating…" : "Create lead"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this lead?"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.company ?? deleteTarget.name ?? "this lead"}? Notes and call history will be removed. Linked clients and projects are kept.`
            : undefined
        }
        confirmLabel="Delete lead"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            const res = await remove.mutateAsync(deleteTarget.id);
            if (res && typeof res === "object" && "error" in res) {
              toast({ title: "Delete failed", description: String((res as { error?: string }).error), variant: "destructive" });
              return;
            }
            toast({ title: "Lead deleted" });
            setDeleteTarget(null);
          } catch (e) {
            toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
          }
        }}
      />
    </div>
  );
}
