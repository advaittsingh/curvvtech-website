import type { ReactNode } from "react";
import { Bot, Sparkles } from "lucide-react";
import type { Lead, LeadAiInsights } from "../schemas";
import { scoreTier, scoreTierColor, scoreTierLabel } from "../constants";
import { AiActionButton } from "@/components/system/AiActionButton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
  const tier = scoreTier(score);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left space-y-3 pb-4 border-b border-border">
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
          </div>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {(aiInsights?.insights ?? []).length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Insights</h3>
              <ul className="space-y-2 text-sm">
                {(aiInsights?.insights ?? []).map((line) => (
                  <li key={line} className="flex gap-2">
                    <Bot className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AiSection title="Proposal builder">
            <AiActionButton label="Generate proposal" loading={actionLoading === "proposal"} onClick={onGenerateProposal} />
            <AiActionButton label="Create scope" loading={aiLoading === "scope"} onClick={() => onAiAction("scope", actions.summarize)} />
            <AiActionButton label="Generate timeline" loading={aiLoading === "timeline"} onClick={() => onAiAction("timeline", actions.meetingQuestions)} />
            <AiActionButton label="Generate pricing" loading={aiLoading === "pricing"} onClick={() => onAiAction("pricing", actions.closeProbability)} />
          </AiSection>

          <AiSection title="Sales assistant">
            <AiActionButton label="Draft follow-up" loading={aiLoading === "email"} onClick={() => onAiAction("email", actions.emailDraft)} />
            <AiActionButton label="Draft WhatsApp message" loading={aiLoading === "whatsapp"} onClick={() => onAiAction("whatsapp", actions.emailDraft)} />
            <AiActionButton label="Handle objection" loading={aiLoading === "objection"} onClick={() => onAiAction("objection", actions.summarize)} />
            <AiActionButton label="Negotiation advice" loading={aiLoading === "negotiation"} onClick={() => onAiAction("negotiation", actions.closeProbability)} />
          </AiSection>

          <AiSection title="Research">
            <AiActionButton label="Company summary" loading={aiLoading === "company"} onClick={() => onAiAction("company", actions.summarize)} />
            <AiActionButton label="Industry analysis" loading={aiLoading === "industry"} onClick={() => onAiAction("industry", actions.summarize)} />
            <AiActionButton label="Competitor analysis" loading={aiLoading === "competitor"} onClick={() => onAiAction("competitor", actions.meetingQuestions)} />
          </AiSection>

          <AiSection title="Quick actions">
            <AiActionButton label="Summarize lead" loading={aiLoading === "summary"} onClick={() => onAiAction("summary", actions.summarize)} />
            <AiActionButton label="Predict close probability" loading={aiLoading === "close"} onClick={() => onAiAction("close", actions.closeProbability)} />
            <AiActionButton label="Meeting questions" loading={aiLoading === "questions"} onClick={() => onAiAction("questions", actions.meetingQuestions)} />
          </AiSection>

          {(aiInsights?.recommended_actions ?? []).length > 0 && (
            <section className="space-y-2 pt-2 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended</h3>
              {(aiInsights?.recommended_actions ?? []).map((action) => (
                <Button key={action.kind + action.label} variant="secondary" size="sm" className="w-full justify-start">
                  {action.label}
                </Button>
              ))}
            </section>
          )}

          {aiOutput && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">{aiOutput}</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AiSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
