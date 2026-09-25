import { useState } from "react";
import type { ReactNode } from "react";
import { Bot, Sparkles } from "lucide-react";
import type { Lead, LeadAiInsights } from "../schemas";
import { computeDealHealth } from "../lead.utils";
import { scoreTier, scoreTierColor, scoreTierLabel } from "../constants";
import { LeadScoreBreakdown } from "./LeadScoreBreakdown";
import { AiActionButton } from "@/components/system/AiActionButton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  "summary",
  "requirements",
  "objections",
  "risks",
  "budget",
  "competitors",
  "proposal",
  "followup",
  "questions",
  "action",
] as const;

type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  summary: "Summary",
  requirements: "Requirements",
  objections: "Objections",
  risks: "Risks",
  budget: "Budget",
  competitors: "Competitors",
  proposal: "Proposal draft",
  followup: "Follow-up draft",
  questions: "Questions to ask",
  action: "Suggested next action",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  score: number;
  aiInsights?: LeadAiInsights | null;
  aiOutput: string;
  aiLoading: string;
  actionLoading: string;
  onGenerateProposal: () => void;
  onAiAction: (key: string, fn: () => Promise<void>) => void;
  actions: {
    emailDraft: () => Promise<void>;
    summarize: () => Promise<void>;
    closeProbability: () => Promise<void>;
    meetingQuestions: () => Promise<void>;
  };
};

export function LeadAiSheet({
  open,
  onOpenChange,
  lead,
  score,
  aiInsights,
  aiOutput,
  aiLoading,
  actionLoading,
  onGenerateProposal,
  onAiAction,
  actions,
}: Props) {
  const [section, setSection] = useState<Section>("summary");
  const tier = scoreTier(score);
  const health = computeDealHealth(lead, score, aiInsights);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="text-left space-y-3 p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>AI Assistant</SheetTitle>
              <SheetDescription>{lead.name ?? "Lead"} · {lead.company ?? "Deal workspace"}</SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={scoreTierColor(tier)}>
              {score} / 100
            </Badge>
            <Badge variant="secondary">{scoreTierLabel(tier)}</Badge>
            <Badge variant="outline">Health {health.healthPct}%</Badge>
          </div>
        </SheetHeader>

        <div className="flex flex-col sm:flex-row min-h-0">
          <nav className="sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-border p-2 sm:p-3 space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-md transition-colors",
                  section === s ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {SECTION_LABELS[s]}
              </button>
            ))}
          </nav>

          <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto">
            {section === "summary" && (
              <SectionBlock title="Deal summary">
                <p className="text-sm leading-relaxed">{health.aiSummary}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {(aiInsights?.insights ?? []).map((line) => (
                    <li key={line} className="flex gap-2">
                      <Bot className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <AiActionButton label="Refresh summary" loading={aiLoading === "summary"} onClick={() => onAiAction("summary", actions.summarize)} />
                </div>
              </SectionBlock>
            )}

            {section === "requirements" && (
              <SectionBlock title="Requirements">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {lead.requirements ?? lead.message ?? "No requirements captured yet."}
                </p>
                <AiActionButton label="Extract from notes" loading={aiLoading === "scope"} onClick={() => onAiAction("scope", actions.summarize)} />
              </SectionBlock>
            )}

            {section === "objections" && (
              <SectionBlock title="Objections">
                <p className="text-sm text-muted-foreground">Common objections for this deal stage — generate handling scripts.</p>
                <AiActionButton label="Handle objection" loading={aiLoading === "objection"} onClick={() => onAiAction("objection", actions.summarize)} />
              </SectionBlock>
            )}

            {section === "risks" && (
              <SectionBlock title="Risks">
                <ul className="text-sm space-y-1">
                  <li>Risk level: <strong>{health.risk}</strong></li>
                  <li>Engagement: <strong>{health.engagement}</strong></li>
                  <li>Decision maker: <strong>{health.decisionMaker}</strong></li>
                </ul>
                <AiActionButton label="Risk analysis" loading={aiLoading === "close"} onClick={() => onAiAction("close", actions.closeProbability)} />
              </SectionBlock>
            )}

            {section === "budget" && (
              <SectionBlock title="Budget">
                <p className="text-sm">Deal value: {lead.deal_value_cents ? `₹${(lead.deal_value_cents / 100).toLocaleString("en-IN")}` : "—"}</p>
                <p className="text-sm">Stated budget: {lead.budget ?? "—"}</p>
                <p className="text-sm">Budget match: <strong>{health.budgetMatchPct}%</strong></p>
                <AiActionButton label="Generate pricing" loading={aiLoading === "pricing"} onClick={() => onAiAction("pricing", actions.closeProbability)} />
              </SectionBlock>
            )}

            {section === "competitors" && (
              <SectionBlock title="Competitors">
                <p className="text-sm text-muted-foreground">Track who the client is comparing you with.</p>
                <AiActionButton label="Competitor analysis" loading={aiLoading === "competitor"} onClick={() => onAiAction("competitor", actions.meetingQuestions)} />
              </SectionBlock>
            )}

            {section === "proposal" && (
              <SectionBlock title="Proposal draft">
                <AiActionButton label="Generate proposal" loading={actionLoading === "proposal"} onClick={onGenerateProposal} />
                <AiActionButton label="Create scope" loading={aiLoading === "scope"} onClick={() => onAiAction("scope", actions.summarize)} />
                <AiActionButton label="Generate timeline" loading={aiLoading === "timeline"} onClick={() => onAiAction("timeline", actions.meetingQuestions)} />
              </SectionBlock>
            )}

            {section === "followup" && (
              <SectionBlock title="Follow-up draft">
                <AiActionButton label="Draft follow-up email" loading={aiLoading === "email"} onClick={() => onAiAction("email", actions.emailDraft)} />
                <AiActionButton label="Draft WhatsApp message" loading={aiLoading === "whatsapp"} onClick={() => onAiAction("whatsapp", actions.emailDraft)} />
              </SectionBlock>
            )}

            {section === "questions" && (
              <SectionBlock title="Questions to ask">
                <AiActionButton label="Meeting questions" loading={aiLoading === "questions"} onClick={() => onAiAction("questions", actions.meetingQuestions)} />
              </SectionBlock>
            )}

            {section === "action" && (
              <SectionBlock title="Suggested next action">
                <Button className="w-full justify-start mb-3" onClick={onGenerateProposal}>
                  {health.recommendedAction}
                </Button>
                {(aiInsights?.recommended_actions ?? []).map((action) => (
                  <Button key={action.kind + action.label} variant="secondary" size="sm" className="w-full justify-start mb-2">
                    {action.label}
                  </Button>
                ))}
              </SectionBlock>
            )}

            <LeadScoreBreakdown lead={lead} score={score} />

            {aiOutput && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">{aiOutput}</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
