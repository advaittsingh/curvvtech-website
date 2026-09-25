import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/app/providers";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { normalizeCeoCommandCenter, greetingName, timeGreeting } from "../ceo.utils";
import { normalizeDashboardOverview } from "@/features/dashboard/dashboard.utils";
import {
  CeoChartsSection,
  CeoDailyBrief,
  CeoExecutiveWidgets,
  CeoHealthAndTeam,
  CeoHeroSection,
  CeoMoneyGrid,
  CeoProjectRisks,
  CeoRankedActions,
  CeoScoreBreakdown,
} from "../components/CeoSections";

export default function CeoCommandCenterPage() {
  const api = useAdminApi();
  const { user } = useAuth();
  const { data: raw, error, isLoading } = useQuery({
    queryKey: ["admin", "analytics", "ceo"],
    queryFn: () => api.analytics.ceo(),
    staleTime: 60_000,
  });

  const { data: overviewRaw } = useQuery({
    queryKey: ["admin", "dashboard", "overview"],
    queryFn: () => api.analytics.overview(),
    staleTime: 60_000,
  });

  const overview = overviewRaw ? normalizeDashboardOverview(overviewRaw) : undefined;
  const data = raw ? normalizeCeoCommandCenter(raw, overview) : overview ? normalizeCeoCommandCenter({}, overview) : undefined;
  const userName = greetingName(user?.email);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 bg-background min-h-full max-w-[1600px] mx-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">CEO Command Center</h1>
          <p className="text-sm text-muted-foreground">Your 2-minute morning briefing — what needs attention today.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">Standard dashboard</Link>
        </Button>
      </div>

      <BackendErrorAlert error={error} />

      <CeoHeroSection data={data} userName={userName} greeting={timeGreeting()} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CeoDailyBrief data={data} isLoading={isLoading} />
        </div>
        <CeoRankedActions data={data} isLoading={isLoading} />
      </div>

      <CeoScoreBreakdown data={data} isLoading={isLoading} />

      <CeoMoneyGrid data={data} isLoading={isLoading} />

      <CeoHealthAndTeam data={data} isLoading={isLoading} />

      <CeoExecutiveWidgets data={data} isLoading={isLoading} />

      <CeoChartsSection data={data} isLoading={isLoading} />

      <CeoProjectRisks data={data} isLoading={isLoading} />
    </div>
  );
}
