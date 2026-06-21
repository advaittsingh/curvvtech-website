import { cn } from "@/lib/utils";
import type { ProposalSectionRef } from "../constants";

type Props = {
  sections: ProposalSectionRef[];
  activeKey?: string;
  onJump: (sectionKey: string) => void;
  className?: string;
};

export function ProposalSectionsNav({ sections, activeKey, onJump, className }: Props) {
  if (sections.length === 0) return null;

  return (
    <aside className={cn("rounded-xl border border-border bg-card p-4 space-y-2 min-w-0 overflow-hidden", className)}>
      <h3 className="font-medium text-sm">Sections</h3>
      <nav className="space-y-0.5 max-h-64 overflow-y-auto">
        {sections.map((s) => {
          const key = s.section_key ?? s.title;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onJump(key)}
              className={cn(
                "w-full text-left text-xs px-2 py-1.5 rounded-md truncate transition-colors",
                activeKey === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s.title}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
