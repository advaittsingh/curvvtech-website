import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default function Dashboard() {
  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <DashboardOverview />
    </div>
  );
}
