import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/app/providers";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { normalizeDashboardOverview } from "../dashboard.utils";
import { DashboardSecondaryWidgets } from "../components/DashboardSecondaryWidgets";
import { AiBusinessAssistant } from "../components/AiBusinessAssistant";
import { DashboardHero, TodayBusinessStrip } from "../components/DashboardHero";
import { DashboardWidgetsGrid } from "../components/DashboardWidgetsGrid";
import { ExecutiveKpiCards } from "../components/ExecutiveKpiCards";
import { ProjectHealthWidget } from "../components/ProjectHealthWidget";
import { RevenueAnalyticsChart } from "../components/RevenueAnalyticsChart";

export default function DashboardPage() {
  const api = useAdminApi();
  const { user } = useAuth();
  const { data: raw, error, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "overview"],
    queryFn: () => api.analytics.overview(),
    staleTime: 60_000,
  });

  const data = raw ? normalizeDashboardOverview(raw) : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8 custom-scrollbar space-y-4 bg-background min-h-full max-w-[1600px] mx-auto">
      <BackendErrorAlert error={error} />

      <DashboardHero data={data} userEmail={user?.email} isLoading={isLoading} />

      <TodayBusinessStrip data={data} isLoading={isLoading} />

      <ExecutiveKpiCards data={data} isLoading={isLoading} />

      <DashboardSecondaryWidgets data={data} isLoading={isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <AiBusinessAssistant data={data} userEmail={user?.email} isLoading={isLoading} />
        </div>
        <ProjectHealthWidget data={data} isLoading={isLoading} />
      </div>

      <RevenueAnalyticsChart data={data} isLoading={isLoading} />

      <DashboardWidgetsGrid data={data} isLoading={isLoading} />
    </div>
  );
}
