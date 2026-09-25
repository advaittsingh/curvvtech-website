import { DetailTabTrigger } from "@/components/crm/DetailTabs";
import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Tabs visible in the project workspace — matches the design mockup. */
export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "team", label: "Team" },
  { id: "milestones", label: "Milestones" },
  { id: "timeline", label: "Timeline" },
  { id: "documents", label: "Documents" },
  { id: "finance", label: "Finance" },
  { id: "analytics", label: "Analytics" },
  { id: "activity", label: "Activity" },
  { id: "scope", label: "Scope" },
  { id: "revisions", label: "Revisions" },
  { id: "change-orders", label: "Changes" },
  { id: "approvals", label: "Approvals" },
] as const;

/** Extra sections kept in the page but not shown in the tab bar. */
export const HIDDEN_SECTIONS = [
  { id: "resources", label: "Resources" },
  { id: "deployment", label: "Deploy" },
  { id: "insights", label: "Insights" },
] as const;

export function ProjectWorkspaceTabs() {
  return (
    <div className="border-b border-border -mx-1 px-1">
      <div className="overflow-x-auto scrollbar-thin">
        <TabsList className="inline-flex h-auto min-w-max w-auto justify-start gap-0 bg-transparent p-0 rounded-none">
          {SECTIONS.map((s) => (
            <DetailTabTrigger
              key={s.id}
              value={s.id}
              className={cn(
                "rounded-none border-0 border-b-2 border-transparent bg-transparent shadow-none",
                "px-4 py-2.5 text-sm font-normal text-muted-foreground",
                "data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "data-[state=active]:font-semibold data-[state=active]:text-foreground",
              )}
            >
              {s.label}
            </DetailTabTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
}
