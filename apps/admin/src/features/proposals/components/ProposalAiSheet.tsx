import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PROPOSAL_SECTION_AI_ACTION, type ProposalSectionRef } from "../constants";

const PRIMARY = [
  { key: "generate_consulting", label: "Generate consulting proposal", description: "Business analysis → full proposal" },
  { key: "business_analysis", label: "Analyze business only", description: "Industry, model, opportunities" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: string;
  sections: ProposalSectionRef[];
  onAction: (action: string) => void;
};

export function ProposalAiSheet({ open, onOpenChange, loading, sections, onAction }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>AI Proposal Engine</SheetTitle>
          <SheetDescription>
            Click <strong>Generate consulting proposal</strong> to fill all blocks. Regenerate individual sections below — same list as your proposal blocks.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary</p>
            {PRIMARY.map((a) => (
              <Button
                key={a.key}
                variant={a.key === "generate_consulting" ? "default" : "outline"}
                className="w-full justify-start h-auto py-3 flex-col items-start"
                disabled={Boolean(loading)}
                onClick={() => onAction(a.key)}
              >
                <span>{loading === a.key ? "Generating…" : a.label}</span>
                <span className="text-xs font-normal opacity-80 mt-0.5">{a.description}</span>
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Regenerate section</p>
              <span className="text-[10px] text-muted-foreground tabular-nums">{sections.length} blocks</span>
            </div>
            <div className="grid gap-1.5">
              {sections.map((s) => {
                const action = s.section_key ? PROPOSAL_SECTION_AI_ACTION[s.section_key] : null;
                const canRegenerate = Boolean(action);
                return (
                  <Button
                    key={s.section_key ?? s.title}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-left h-auto min-h-8 py-1.5"
                    disabled={Boolean(loading) || !canRegenerate}
                    onClick={() => action && onAction(action)}
                    title={canRegenerate ? undefined : "This block is filled via structured data or full generate"}
                  >
                    {loading === action ? "Generating…" : s.title}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
