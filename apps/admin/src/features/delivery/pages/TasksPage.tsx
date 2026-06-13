import { PageHeader, EmptyState } from "@/components/system";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  return (
    <div className="p-6">
      <PageHeader title="Tasks" description="Cross-project task list and assignments." />
      <EmptyState title="Task board" description="Tasks will aggregate from project milestones and assignments." cta={<Button disabled>Coming soon</Button>} />
    </div>
  );
}
