import { Sparkles } from "lucide-react";
import type { ClientAiSummary } from "../schemas";
import { formatInr, healthTier, healthTierColor, healthTierLabel } from "../constants";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  data: ClientAiSummary | null;
  loading: boolean;
};

export function ClientAiSheet({ open, onOpenChange, clientName, data, loading }: Props) {
  const score = data?.health_score ?? 0;
  const tier = healthTier(score);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left space-y-3 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>AI Client Summary</SheetTitle>
              <SheetDescription>{clientName}</SheetDescription>
            </div>
          </div>
          {data && (
            <Badge variant="outline" className={healthTierColor(tier)}>
              Health {score}/100 · {healthTierLabel(tier)}
            </Badge>
          )}
        </SheetHeader>

        <div className="py-4 space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Analyzing client relationship…</p>
          ) : (
            <>
              <InsightGrid data={data} />
              {data?.summary && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap">
                  {data.summary}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InsightGrid({ data }: { data: ClientAiSummary | null }) {
  if (!data) return null;
  const items = [
    { label: "Outstanding", value: formatInr(data.outstanding_cents) },
    { label: "Open projects", value: String(data.active_projects ?? 0) },
    { label: "Pending invoices", value: String(data.pending_invoices ?? 0) },
    {
      label: "Last contact",
      value: data.days_since_contact == null ? "Unknown" : data.days_since_contact === 0 ? "Today" : `${data.days_since_contact}d ago`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-sm font-semibold mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
