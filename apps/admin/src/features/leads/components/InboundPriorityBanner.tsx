import { AlertTriangle, CalendarClock, Flame, Sparkles, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PriorityItem, PriorityTone } from "../inbound-metrics";
import type { SalesStage } from "../demo-schemas";

const TONE: Record<PriorityTone, { icon: LucideIcon; chip: string; iconColor: string }> = {
  hot: { icon: Flame, chip: "bg-red-50 border-red-200", iconColor: "text-red-500" },
  meeting: { icon: CalendarClock, chip: "bg-violet-50 border-violet-200", iconColor: "text-violet-500" },
  warn: { icon: AlertTriangle, chip: "bg-amber-50 border-amber-200", iconColor: "text-amber-500" },
  money: { icon: TrendingUp, chip: "bg-emerald-50 border-emerald-200", iconColor: "text-emerald-600" },
};

type Props = {
  items: PriorityItem[];
  onFocus?: (stage: SalesStage | "all") => void;
};

export function InboundPriorityBanner({ items, onFocus }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">You're all caught up</p>
          <p className="text-xs text-emerald-700">No hot leads, overdue proposals, or meetings need attention right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI recommendations</h3>
        <span className="text-xs text-muted-foreground">Where your team should focus today</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {items.map((item, i) => {
          const tone = TONE[item.tone];
          const Icon = tone.icon;
          const clickable = Boolean(item.stage && onFocus);
          return (
            <button
              key={`${item.tone}-${i}`}
              type="button"
              disabled={!clickable}
              onClick={() => item.stage && onFocus?.(item.stage)}
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${tone.chip} ${
                clickable ? "hover:brightness-[0.98] cursor-pointer" : "cursor-default"
              }`}
            >
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${tone.iconColor}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight text-stone-900">{item.title}</p>
                {item.detail && <p className="text-[11px] text-stone-600 mt-0.5">{item.detail}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
