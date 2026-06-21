import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { RoleCardData } from "../../roles-schemas";
import type { AdminRole } from "@/types/auth";

type Props = {
  roles: RoleCardData[];
  selected: AdminRole | null;
  onSelect: (role: AdminRole) => void;
};

export function RoleCardsGrid({ roles, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
      {roles.map((r) => {
        const active = selected === r.role;
        return (
          <button
            key={r.role}
            type="button"
            onClick={() => onSelect(r.role)}
            className={cn(
              "h-full min-h-[8.5rem] flex flex-col rounded-xl border text-left p-4 shadow-sm transition-all hover:border-primary/40",
              active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card",
            )}
          >
            <div className="flex items-start justify-between gap-2 min-h-[2.25rem]">
              <p className="font-semibold text-sm leading-snug line-clamp-2 min-w-0">{r.label}</p>
              <Badge variant="outline" className="text-[10px] shrink-0 max-w-[48%] truncate">
                {r.accessTag}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 min-h-[2.5rem] flex-1">
              {r.description}
            </p>
            <p className="text-sm font-medium pt-3 tabular-nums shrink-0">
              {r.member_count} member{r.member_count === 1 ? "" : "s"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
