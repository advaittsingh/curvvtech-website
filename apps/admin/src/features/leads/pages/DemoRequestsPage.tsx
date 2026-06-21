import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Inbox, Sparkles, Target, TrendingUp } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { DemoRequestCard } from "../components/DemoRequestCard";
import { DemoAiSheet } from "../components/DemoAiSheet";
import type { InboundOpportunity, InboundPipelineSummary, SalesStage } from "../demo-schemas";
import { SALES_STAGE_LABELS, SALES_STAGES } from "../demo-schemas";
import { formatInr } from "../constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | SalesStage;

export default function DemoRequestsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
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

  const { data: summary } = useQuery({
    queryKey: ["admin", "demo-requests", "summary"],
    queryFn: () => api.demoRequests.pipelineSummary() as Promise<InboundPipelineSummary>,
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

  const filtered = useMemo(() => {
    if (filter === "all") return list;
    return list.filter((r) => (r.sales_stage ?? r.display_status ?? "new") === filter);
  }, [list, filter]);

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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Inbound opportunities"
        description="AI-scored enquiries from your website — prioritized by value and close probability."
      />

      <BackendErrorAlert error={error} />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryTile icon={Inbox} label="Total inbound" value={String(summary.total)} />
          <SummaryTile icon={TrendingUp} label="Pipeline value" value={formatInr(summary.total_value_cents)} highlight />
          <SummaryTile icon={DollarSign} label="Expected revenue" value={formatInr(summary.expected_revenue_cents ?? 0)} />
          <SummaryTile icon={Target} label="Avg score" value={summary.avg_score ? `${summary.avg_score}/100` : "—"} />
        </div>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          {SALES_STAGES.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs sm:text-sm">
              {SALES_STAGE_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {batchAnalyze.isPending && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse text-primary" />
          Running AI analysis on pending opportunities…
        </p>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No inbound opportunities in this view.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((row) => (
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

function SummaryTile({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
