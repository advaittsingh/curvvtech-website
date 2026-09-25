import { Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AutomationsEmptyState({
  onCreate,
  onBrowseTemplates,
}: {
  onCreate: () => void;
  onBrowseTemplates: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
        <Zap className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">Put your business on autopilot</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Automations run the busywork for you — turn won leads into projects, send invoices when proposals are
        accepted, and nudge clients on overdue payments. No code required.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button className="gap-2" onClick={onCreate}>
          <Sparkles className="h-4 w-4" /> Create your first workflow
        </Button>
        <Button variant="outline" className="gap-2" onClick={onBrowseTemplates}>
          Browse templates <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
