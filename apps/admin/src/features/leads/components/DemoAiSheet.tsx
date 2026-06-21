import { Bot, Sparkles } from "lucide-react";
import type { InboundOpportunity } from "../demo-schemas";
import { formatScore100, score100FromDemo } from "../demo-schemas";
import { scoreTier, scoreTierColor, scoreTierLabel } from "../constants";
import { AiActionButton } from "@/components/system/AiActionButton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: InboundOpportunity;
  aiOutput: string;
  aiLoading: string;
  onAiAction: (key: string, fn: () => Promise<void>) => void;
  actions: {
    summarize: () => Promise<void>;
    estimateBudget: () => Promise<void>;
    suggestQuestions: () => Promise<void>;
    generateProposal: () => Promise<void>;
    generateFollowUp: () => Promise<void>;
    identifyRisks: () => Promise<void>;
    recommendServices: () => Promise<void>;
    closeProbability: () => Promise<void>;
  };
};

export function DemoAiSheet({ open, onOpenChange, row, aiOutput, aiLoading, onAiAction, actions }: Props) {
  const score100 = score100FromDemo(row);
  const tier = scoreTier(score100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="text-left space-y-3 p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Ask AI</SheetTitle>
              <SheetDescription>{row.name} · {row.company ?? "Inbound opportunity"}</SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={scoreTierColor(tier)}>
              {formatScore100(row)}
            </Badge>
            <Badge variant="secondary">{scoreTierLabel(tier)}</Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-6">
            <AiSection title="Lead intelligence">
              <AiActionButton label="Summarize lead" loading={aiLoading === "summarize"} onClick={() => onAiAction("summarize", actions.summarize)} />
              <AiActionButton label="Estimate budget" loading={aiLoading === "estimate_budget"} onClick={() => onAiAction("estimate_budget", actions.estimateBudget)} />
              <AiActionButton label="Calculate close probability" loading={aiLoading === "close_probability"} onClick={() => onAiAction("close_probability", actions.closeProbability)} />
            </AiSection>

            <AiSection title="Discovery">
              <AiActionButton label="Suggest questions" loading={aiLoading === "suggest_questions"} onClick={() => onAiAction("suggest_questions", actions.suggestQuestions)} />
              <AiActionButton label="Identify risks" loading={aiLoading === "risks"} onClick={() => onAiAction("risks", actions.identifyRisks)} />
              <AiActionButton label="Recommend services" loading={aiLoading === "recommend_services"} onClick={() => onAiAction("recommend_services", actions.recommendServices)} />
            </AiSection>

            <AiSection title="Outreach & proposals">
              <AiActionButton label="Generate follow-up" loading={aiLoading === "generate_followup"} onClick={() => onAiAction("generate_followup", actions.generateFollowUp)} />
              <AiActionButton label="Generate proposal outline" loading={aiLoading === "generate_proposal"} onClick={() => onAiAction("generate_proposal", actions.generateProposal)} />
            </AiSection>

            {aiOutput && (
              <section className="space-y-2 pb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" /> AI output
                </h3>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-muted/50 rounded-lg p-3 border border-border">{aiOutput}</pre>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function AiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
