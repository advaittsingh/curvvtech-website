import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Search, Sparkles } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { DemoRequestCard } from "../components/DemoRequestCard";
import { DemoAiSheet } from "../components/DemoAiSheet";
import { InboundKpiRow } from "../components/InboundKpiRow";
import { InboundPriorityBanner } from "../components/InboundPriorityBanner";
import type { InboundOpportunity, SalesStage } from "../demo-schemas";
import { SALES_STAGE_LABELS, score100FromDemo } from "../demo-schemas";
import { formatInrCompact } from "../constants";
import {
  deriveInboundMetrics,
  derivePriorityItems,
  deriveStageCounts,
  stageOf,
} from "../inbound-metrics";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | SalesStage;

export default function DemoRequestsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiOpenId, setAiOpenId] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
  const batchStarted = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "demo-requests"],
    queryFn: () => api.demoRequests.list() as Promise<InboundOpportunity[]>,
  });

  const { data: members } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });

  const memberList = useMemo(
    () => (Array.isArray(members) ? members : []) as { user_id: string; email: string }[],
    [members],
  );

  const list: InboundOpportunity[] = Array.isArray(data) ? data : [];

  const metrics = useMemo(() => deriveInboundMetrics(list), [list]);
  const priorityItems = useMemo(() => derivePriorityItems(list), [list]);
  const stageCounts = useMemo(() => deriveStageCounts(list), [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (filter !== "all" && stageOf(r) !== filter) return false;
      if (!q) return true;
      const hay = [r.name, r.email, r.company, r.phone, r.project_type, r.ai_intelligence?.industry]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, filter, search]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => score100FromDemo(b) - score100FromDemo(a)),
    [filtered],
  );

  const analyze = useMutation({
    mutationFn: (id: string) => api.demoRequests.analyze(id) as Promise<InboundOpportunity>,
    onSuccess: (updated) => {
      qc.setQueryData(["admin", "demo-requests"], (old: InboundOpportunity[] | undefined) =>
        (old ?? []).map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests", updated.id, "activity"] });
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests", "summary"] });
    },
    onError: (e: Error) => toast({ title: "Analysis failed", description: e.message, variant: "destructive" }),
  });

  const batchAnalyze = useMutation({
    mutationFn: () => api.demoRequests.analyzePending(15),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests", "summary"] });
    },
  });

  useEffect(() => {
    if (batchStarted.current || !list.length) return;
    const unanalyzed = list.filter((r) => !r.analyzed_at).length;
    if (unanalyzed > 0) {
      batchStarted.current = true;
      batchAnalyze.mutate();
    }
  }, [list.length]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.demoRequests.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "demo-requests"] }),
  });

  const assign = useMutation({
    mutationFn: ({ id, assigned_user_id }: { id: string; assigned_user_id: string }) =>
      api.demoRequests.update(id, { assigned_user_id }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests", vars.id, "activity"] });
    },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, sales_stage }: { id: string; sales_stage: SalesStage }) =>
      api.demoRequests.update(id, { sales_stage }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests", vars.id, "activity"] });
    },
  });

  const selectedRow = list.find((r) => r.id === aiOpenId);

  function toggleExpand(id: string) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    const row = list.find((r) => r.id === id);
    if (next && row && !row.analyzed_at && !analyze.isPending) {
      analyze.mutate(id);
    }
  }

  async function runAction(id: string, key: string, fn: () => Promise<unknown>, success: string) {
    setActionLoading(key);
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "demo-requests", id, "activity"] });
      toast({ title: success });
    } catch (e) {
      toast({ title: "Action failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function runAi(key: string, fn: () => Promise<void>) {
    setAiLoading(key);
    try {
      await fn();
    } catch (e) {
      toast({ title: "AI failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAiLoading("");
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Inbound opportunities"
        description="Your sales command center — AI-scored website enquiries, prioritized by value and close probability."
      />

      <BackendErrorAlert error={error} />

      <InboundKpiRow metrics={metrics} />

      <InboundPriorityBanner
        items={priorityItems}
        onFocus={(stage) => setFilter(stage === "all" ? "all" : (stage as Filter))}
      />

      {/* Pipeline value by stage */}
      {metrics.pipelineValueCents > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline by stage</span>
          {stageCounts
            .filter((s) => s.stage !== "all" && s.valueCents > 0)
            .map((s) => (
              <span key={s.stage} className="inline-flex items-center gap-1.5">
                <span className="text-muted-foreground">{SALES_STAGE_LABELS[s.stage as SalesStage]}</span>
                <span className="font-semibold">{formatInrCompact(s.valueCents)}</span>
              </span>
            ))}
        </div>
      )}

      {/* Search + stage filter pills */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, phone…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stageCounts.map((s) => {
            const active = filter === s.stage;
            const label = s.stage === "all" ? "All" : SALES_STAGE_LABELS[s.stage as SalesStage];
            return (
              <button
                key={s.stage}
                type="button"
                onClick={() => setFilter(s.stage as Filter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {batchAnalyze.isPending && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse text-primary" />
          Running AI analysis on pending opportunities…
        </p>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && filtered.length === 0 && list.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No opportunities match this view. Try a different stage or search.
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
          <p className="font-medium">No inbound enquiries yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Website demo requests and contact-form enquiries will appear here automatically, scored and prioritized by AI.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sortedFiltered.map((row) => (
          <DemoRequestCard
            key={row.id}
            row={row}
            members={memberList}
            expanded={expandedId === row.id}
            onToggle={() => toggleExpand(row.id)}
            analyzing={analyze.isPending && analyze.variables === row.id}
            actionLoading={actionLoading}
            followUpDraft={followUpDrafts[row.id]}
            onAnalyze={() => analyze.mutate(row.id)}
            onConfirm={() => updateStatus.mutate({ id: row.id, status: "confirmed" })}
            onAssign={(userId) => assign.mutate({ id: row.id, assigned_user_id: userId })}
            onStageChange={(stage) => updateStage.mutate({ id: row.id, sales_stage: stage })}
            onCreateLead={() =>
              runAction(row.id, "lead", () => api.demoRequests.convertToLead(row.id), "Lead created")
            }
            onCreatePipeline={() =>
              runAction(row.id, "pipeline", async () => {
                const res = (await api.demoRequests.convertToPipeline(row.id)) as { lead_id?: string };
                if (res.lead_id) navigate(`/leads/${res.lead_id}`);
              }, "Lead, client & opportunity created")
            }
            onCreateProposal={() =>
              runAction(row.id, "proposal", async () => {
                const res = (await api.demoRequests.createProposal(row.id)) as { proposal_id?: string };
                if (res.proposal_id) navigate(`/proposals/${res.proposal_id}`);
              }, "Proposal created")
            }
            onGenerateFollowUp={async () => {
              try {
                const res = (await api.demoRequests.followUp(row.id)) as { draft?: string };
                if (res.draft) setFollowUpDrafts((d) => ({ ...d, [row.id]: res.draft! }));
              } catch (e) {
                toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
              }
            }}
            onOpenAi={() => setAiOpenId(row.id)}
            onScheduleCall={() => {
              updateStage.mutate({ id: row.id, sales_stage: "discovery_scheduled" });
              toast({ title: "Discovery scheduled", description: row.date && row.time ? `${row.date} at ${row.time}` : undefined });
            }}
          />
        ))}
      </div>

      {selectedRow && (
        <DemoAiSheet
          open={Boolean(aiOpenId)}
          onOpenChange={(open) => !open && setAiOpenId(null)}
          row={selectedRow}
          aiOutput={aiOutput}
          aiLoading={aiLoading}
          onAiAction={runAi}
          actions={{
            summarize: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "summarize")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
            estimateBudget: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "estimate_budget")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
            suggestQuestions: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "suggest_questions")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
            generateProposal: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "generate_proposal")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
            generateFollowUp: async () => {
              const res = (await api.demoRequests.followUp(selectedRow.id)) as { draft?: string };
              setAiOutput(res.draft ?? "");
            },
            identifyRisks: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "risks")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
            recommendServices: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "recommend_services")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
            closeProbability: async () => {
              const res = (await api.demoRequests.aiAction(selectedRow.id, "close_probability")) as { text?: string };
              setAiOutput(res.text ?? "");
            },
          }}
        />
      )}
    </div>
  );
}
