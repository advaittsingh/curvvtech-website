import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline";
};

type Props = {
  title?: string;
  actions: QuickAction[];
  className?: string;
};

export function QuickActionsPanel({ title = "Quick actions", actions, className }: Props) {
  return (
    <aside className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <ul className="space-y-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.label}>
              <Button
                variant={action.variant ?? "ghost"}
                size="sm"
                className="w-full justify-start gap-2 h-9 font-normal"
                onClick={action.onClick}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {action.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
