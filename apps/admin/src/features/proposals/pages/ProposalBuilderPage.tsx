import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { ProposalCommandHeader } from "../components/ProposalHeader";
import { ProposalSettingsPanel, ProposalActivityPanel, ProposalSectionBlock, BusinessAnalysisPanel } from "../components/ProposalBlocks";
import { ProposalSortableSections } from "../components/ProposalSortableSections";
import { ProposalPreview } from "../components/ProposalPreview";
import { ProposalBlockPicker } from "../components/ProposalBlockPicker";
import { ProposalApprovalPanel } from "../components/ProposalApprovalPanel";
import { ProposalSectionsNav } from "../components/ProposalSectionsNav";
import { ProposalAiSheet } from "../components/ProposalAiSheet";
import { BLOCK_TYPES, CONSULTING_PROPOSAL_SECTIONS, defaultMetadata, mergeConsultingAiIntoProposal, sumLineItems, type ConsultingAiResult, type ProposalMetadata } from "../constants";
import { useToast } from "@/hooks/use-toast";

type Section = { id: string; title: string; content: string; section_key?: string; block_type?: string };
type Proposal = {
  id: string;
  title: string;
  client_name?: string;
  status: string;
  share_token?: string;
  total_cents?: number;
  project_type?: string;
  currency?: string;
  expected_close_date?: string;
  owner_user_id?: string;
  owner_email?: string;
  lead_name?: string;
  metadata_json?: ProposalMetadata;
  sections?: Section[];
  createdAt?: string;
};

export default function ProposalBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipProposalSyncRef = useRef(false);
  const syncingSectionsRef = useRef(false);
  const [localSections, setLocalSections] = useState<Section[]>([]);
  const [metadata, setMetadata] = useState<ProposalMetadata>({});
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const { data: proposal, error } = useQuery({
    queryKey: ["admin", "proposals", id],
    queryFn: () => api.proposals.get(id!) as Promise<Proposal>,
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: events } = useQuery({
    queryKey: ["admin", "proposals", id, "events"],
    queryFn: () => api.proposals.events(id!),
    enabled: Boolean(id),
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin", "proposals", id, "analytics"],
    queryFn: () => api.proposals.analytics(id!),
    enabled: Boolean(id),
  });

  const { data: members } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });

  const save = useMutation({
    mutationFn: (patch: object) => api.proposals.update(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "proposals", id] });
      qc.invalidateQueries({ queryKey: ["admin", "proposals", id, "events"] });
    },
  });

  const p = proposal as Proposal | undefined;

  useEffect(() => {
    if (skipProposalSyncRef.current) {
      skipProposalSyncRef.current = false;
      return;
    }
    if (p?.sections) setLocalSections(p.sections);
    if (p?.metadata_json && Object.keys(p.metadata_json).length > 0) {
      setMetadata(p.metadata_json);
    } else if (p?.total_cents) {
      setMetadata(defaultMetadata(p.total_cents));
    }
  }, [p?.sections, p?.metadata_json, p?.total_cents]);

  useEffect(() => {
    if (!id || !p?.sections?.length || syncingSectionsRef.current) return;
    const keys = new Set(p.sections.map((s) => s.section_key).filter(Boolean));
    const needsSync =
      p.sections.length !== CONSULTING_PROPOSAL_SECTIONS.length ||
      CONSULTING_PROPOSAL_SECTIONS.some((s) => !keys.has(s.section_key));
    if (!needsSync) return;
    syncingSectionsRef.current = true;
    void api.proposals
      .syncSections(id)
      .then((updated) => applyProposalState(updated as Proposal))
      .catch((e) => {
        toast({
          title: "Could not sync proposal sections",
          description: (e as Error).message,
          variant: "destructive",
        });
      })
      .finally(() => {
        syncingSectionsRef.current = false;
      });
  }, [id, p?.sections?.map((s) => s.section_key).join("|")]);

  function applyProposalState(updated: Proposal) {
    skipProposalSyncRef.current = true;
    qc.setQueryData(["admin", "proposals", id], updated);
    if (updated.metadata_json) setMetadata(updated.metadata_json);
    if (updated.sections?.length) setLocalSections(updated.sections);
  }

  function clearPendingSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }

  function scrollToSection(sectionKey: string) {
    const el = document.getElementById(`proposal-section-${sectionKey}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const memberList = useMemo(
    () => (Array.isArray(members) ? members : []) as { user_id: string; email: string }[],
    [members],
  );

  const computedTotal = useMemo(() => sumLineItems(metadata.line_items), [metadata.line_items]);

  function scheduleSave(patch: object) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(patch), 600);
  }

  function persistSections(sections: Section[]) {
    setLocalSections(sections);
    scheduleSave({ sections });
  }

  function persistMetadata(meta: ProposalMetadata) {
    setMetadata(meta);
    const total = sumLineItems(meta.line_items);
    scheduleSave({ metadata_json: meta, total_cents: total });
  }

  async function handleAddBlock(block: (typeof BLOCK_TYPES)[number]) {
    await api.proposals.addSection(id!, {
      title: block.title,
      section_key: block.section_key,
      block_type: block.block_type,
    });
    qc.invalidateQueries({ queryKey: ["admin", "proposals", id] });
  }

  if (!p) {
    return (
      <div className="p-6">
        <BackendErrorAlert error={error} />
        {!error && <p className="text-muted-foreground">Loading…</p>}
      </div>
    );
  }

  const sections = localSections.length ? localSections : (p.sections ?? []);
  const shareUrl = p.share_token ? api.proposals.shareUrl(p.share_token) : "";
  const eventList = Array.isArray(events) ? events : [];
  const previewProps = {
    title: p.title,
    clientName: p.client_name,
    projectType: p.project_type,
    metadata,
    sections,
    totalCents: computedTotal,
  };

  function downloadPdf() {
    requestAnimationFrame(() => {
      window.print();
    });
  }

  async function handleShare() {
    setActionLoading("share");
    try {
      const res = (await api.proposals.share(id!)) as { share_token: string };
      const url = api.proposals.shareUrl(res.share_token ?? p!.share_token!);
      await navigator.clipboard.writeText(url);
      toast({ title: "Proposal shared", description: "Link copied — client can approve online." });
      qc.invalidateQueries({ queryKey: ["admin", "proposals", id] });
      qc.invalidateQueries({ queryKey: ["admin", "proposals", id, "analytics"] });
    } catch (e) {
      toast({ title: "Share failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function handleDuplicate() {
    setActionLoading("duplicate");
    try {
      const dup = (await api.proposals.duplicate(id!)) as { id: string };
      navigate(`/proposals/${dup.id}`);
    } finally {
      setActionLoading("");
    }
  }

  async function handleConvert() {
    setActionLoading("convert");
    try {
      const res = (await api.proposals.convertToProject(id!)) as {
        project_id?: string;
        invoice_ids?: string[];
        portal_url?: string;
      };
      toast({
        title: "Project created",
        description: `${res.invoice_ids?.length ?? 0} milestone invoice(s) and client portal invite sent.`,
      });
      qc.invalidateQueries({ queryKey: ["admin", "proposals", id] });
      if (res.project_id) navigate(`/projects/${res.project_id}`);
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  }

  async function runAiAction(action: string) {
    setAiLoading(action);
    clearPendingSave();
    try {
      if (action === "generate_consulting") {
        try {
          await api.proposals.syncSections(id!);
        } catch (syncErr) {
          const syncMsg = (syncErr as Error).message;
          if (syncMsg !== "NOT_FOUND") throw syncErr;
          // Older API builds lack sync-sections; GET /proposals/:id normalizes sections on load.
        }

        const res = (await api.ai.proposalAction({ proposal_id: id, action: "generate_consulting" })) as {
          business_analysis?: ProposalMetadata["business_analysis"];
          proposal?: Proposal;
          result?: ConsultingAiResult;
        };

        let updated = (await api.proposals.get(id!)) as Proposal;
        const aiResult = res.result;
        const dbFilled = (updated.sections ?? []).filter((s) => s.content?.trim()).length;

        if (dbFilled === 0 && aiResult) {
          updated = mergeConsultingAiIntoProposal(updated, aiResult) as Proposal;
          updated = (await api.proposals.update(id!, {
            sections: updated.sections,
            metadata_json: updated.metadata_json,
            total_cents: updated.total_cents,
          })) as Proposal;
        } else if (res.proposal?.sections?.length && dbFilled > 0) {
          updated = res.proposal;
        }

        const filledText = (updated.sections ?? []).filter((s) => s.content?.trim()).length;
        const meta = updated.metadata_json ?? {};
        const hasStructured =
          (meta.line_items?.length ?? 0) > 0 ||
          (meta.scope_modules?.groups?.length ?? 0) > 0 ||
          (meta.timeline_milestones?.length ?? 0) > 0;

        if (filledText === 0 && !hasStructured) {
          throw new Error("AI generated no section content — verify OPENAI_API_KEY on the API server and try again");
        }

        applyProposalState(updated);
        skipProposalSyncRef.current = true;

        const analysis = res.business_analysis ?? aiResult?.business_analysis ?? updated.metadata_json?.business_analysis;
        qc.invalidateQueries({ queryKey: ["admin", "proposals", id, "events"] });
        toast({
          title: "Consulting proposal generated",
          description:
            analysis?.recommended_solution ??
            `${filledText} text sections filled${hasStructured ? " · pricing, scope & timeline updated" : ""}.`,
        });
        return;
      }

      const res = (await api.ai.proposalAction({ proposal_id: id, action })) as {
        result?: {
          business_analysis?: ProposalMetadata["business_analysis"];
          line_items?: ProposalMetadata["line_items"];
          payment_milestones?: ProposalMetadata["payment_milestones"];
          timeline_milestones?: ProposalMetadata["timeline_milestones"];
          scope_modules?: ProposalMetadata["scope_modules"];
          sections?: { section_key: string; content: string }[];
          content?: string;
        };
        text?: string;
      };

      if (action === "business_analysis" && res.result?.business_analysis) {
        persistMetadata({ ...metadata, business_analysis: res.result.business_analysis });
        toast({ title: "Business analysis complete" });
        return;
      }

      if (action === "pricing" && res.result?.line_items) {
        persistMetadata({
          ...metadata,
          line_items: res.result.line_items.map((i, idx) => ({ ...i, id: (i as { id?: string }).id ?? String(idx + 1) })),
          payment_milestones: res.result.payment_milestones ?? metadata.payment_milestones,
        });
        toast({ title: "Pricing generated" });
        return;
      }

      if (action === "improve_scope" && res.result && typeof res.result === "object" && "groups" in (res.result as object)) {
        persistMetadata({
          ...metadata,
          scope_modules: res.result as ProposalMetadata["scope_modules"],
        });
        toast({ title: "Scope updated" });
        return;
      }

      if (action === "timeline" && res.result?.timeline_milestones) {
        persistMetadata({
          ...metadata,
          timeline_milestones: res.result.timeline_milestones.map((m, i) => ({ ...m, id: m.id ?? String(i + 1) })),
        });
        toast({ title: "Roadmap generated" });
        return;
      }

      const sectionActions = [
        "executive_summary", "business_understanding", "project_objectives", "proposed_solution",
        "feature_recommendations", "monetization", "ai_opportunities", "tech_architecture", "why_curvvtech", "terms",
      ];
      const actionToSectionKey: Record<string, string> = {
        improve_scope: "detailed_scope",
        timeline: "development_roadmap",
      };
      const text = typeof res.result === "object" && res.result && "content" in res.result
        ? String((res.result as { content: string }).content)
        : res.text ?? "";

      const targetSectionKey = actionToSectionKey[action] ?? action;
      if ((sectionActions.includes(action) || actionToSectionKey[action]) && text) {
        const merged = sections.map((s) =>
          s.section_key === targetSectionKey ? { ...s, content: text } : s,
        );
        persistSections(merged);
        toast({ title: "Section updated" });
        return;
      }

      const legacyMap: Record<string, string> = { shorten: "executive_summary" };
      const targetKey = legacyMap[action];
      if (targetKey && text) {
        persistSections(sections.map((s) => (s.section_key === targetKey ? { ...s, content: text } : s)));
        toast({ title: "Section updated" });
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast({
        title: "AI failed",
        description:
          msg === "NOT_FOUND"
            ? "Proposal AI routes missing on the API server — the backend may need redeploying. Hard refresh and try again."
            : msg,
        variant: "destructive",
      });
    } finally {
      setAiLoading("");
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 overflow-x-hidden">
      <Link to="/proposals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to proposals
      </Link>

      <ProposalCommandHeader
        proposal={{ ...p, total_cents: computedTotal || p.total_cents }}
        computedTotalCents={computedTotal}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onStatusChange={(status) => save.mutate({ status })}
        onAiOpen={() => setAiOpen(true)}
        aiGenerating={Boolean(aiLoading)}
        onPreview={() => shareUrl && window.open(shareUrl, "_blank")}
        onShare={handleShare}
        onPdf={downloadPdf}
        onDuplicate={handleDuplicate}
        onConvert={handleConvert}
        actionLoading={actionLoading}
      />

      <div className="grid lg:grid-cols-[1fr_240px] gap-6">
        <div className="space-y-4 min-w-0">
          {viewMode === "preview" ? (
            <ProposalPreview {...previewProps} />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Proposal blocks</h2>
                <ProposalBlockPicker onAdd={handleAddBlock} />
              </div>
              <ProposalSortableSections
                sections={sections}
                onReorder={persistSections}
                renderSection={(section, idx) => (
                  <div id={section.section_key ? `proposal-section-${section.section_key}` : undefined}>
                    <ProposalSectionBlock
                      key={section.id}
                      section={section}
                      metadata={metadata}
                      onContentChange={(content) => {
                        const next = [...sections];
                        next[idx] = { ...section, content };
                        persistSections(next);
                      }}
                      onMetadataChange={persistMetadata}
                    />
                  </div>
                )}
              />
            </>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          {viewMode === "edit" && (
            <ProposalSectionsNav sections={sections} onJump={scrollToSection} />
          )}
          {metadata.business_analysis && <BusinessAnalysisPanel analysis={metadata.business_analysis} />}
          <ProposalApprovalPanel
            status={p.status}
            shareUrl={shareUrl || undefined}
            events={eventList as { id: string; event_type: string; created_at?: string; metadata?: { note?: string; total_cents?: number } }[]}
            totalCents={computedTotal}
            onConvert={p.status === "approved" ? handleConvert : undefined}
            convertLoading={actionLoading === "convert"}
          />
          {viewMode === "edit" && (
            <ProposalSettingsPanel
              clientName={p.client_name}
              leadName={p.lead_name}
              projectType={p.project_type}
              computedTotalCents={computedTotal}
              currency={p.currency}
              expectedClose={p.expected_close_date}
              ownerId={p.owner_user_id}
              members={memberList}
              onPatch={(body) => save.mutate(body)}
            />
          )}
          <ProposalActivityPanel
            events={eventList}
            analytics={analytics as { view_count?: number; last_viewed_at?: string | null; sent_at?: string | null; approved_at?: string | null } | null}
          />
        </div>
      </div>

      <ProposalAiSheet open={aiOpen} onOpenChange={setAiOpen} loading={aiLoading} sections={sections} onAction={runAiAction} />

      <div id="proposal-print-source" aria-hidden="true">
        <ProposalPreview {...previewProps} />
      </div>
    </div>
  );
}
