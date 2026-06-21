import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { PayrollCommandHeader } from "../components/PayrollCommandHeader";
import { PayrollIntelligencePanel } from "../components/PayrollIntelligencePanel";
import { PayrollTrendChart, DepartmentCostsPanel } from "../components/PayrollTrendChart";
import {
  ContractorsPanel,
  EmployeePayrollTable,
  PayrollHistoryPanel,
  UpcomingPaymentsPanel,
} from "../components/PayrollPanels";
import {
  AddCompensationDialog,
  PayrollRunCreateDialog,
  type CreatePayrollRunPayload,
} from "../components/PayrollRunCreateDialog";
import type { PayrollDashboard } from "../payroll-schemas";

export default function PayrollPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [runOpen, setRunOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "payroll", "dashboard"],
    queryFn: () => api.payroll.dashboard() as Promise<PayrollDashboard>,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["admin", "team", "members"],
    queryFn: () => api.team.members(),
  });

  const members = Array.isArray(teamMembers)
    ? (teamMembers as { user_id: string; name?: string; email?: string }[])
    : [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "payroll"] });
  };

  const createRun = useMutation({
    mutationFn: (payload: CreatePayrollRunPayload) => api.payroll.create(payload),
    onSuccess: () => {
      invalidate();
      setRunOpen(false);
      toast({ title: "Payroll run created" });
    },
    onError: (e) => {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    },
  });

  const createProfile = useMutation({
    mutationFn: (body: object) => api.payroll.createProfile(body),
    onSuccess: () => {
      invalidate();
      setProfileOpen(false);
      toast({ title: "Added to payroll" });
    },
    onError: (e) => {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    },
  });

  const hasPeople =
    (data?.employees?.length ?? 0) + (data?.contractors?.length ?? 0) > 0 ||
    (data?.payroll_history?.length ?? 0) > 0;

  return (
    <div className="p-6 space-y-6">
      <PayrollCommandHeader summary={data?.summary} onCreateRun={() => setRunOpen(true)} />
      {error && <BackendErrorAlert error={error as Error} />}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setProfileOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          Add person
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6 min-w-0">
          <PayrollTrendChart trend={data?.payroll_trend ?? []} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EmployeePayrollTable employees={data?.employees ?? []} />
            <ContractorsPanel contractors={data?.contractors ?? []} />
          </div>

          <DepartmentCostsPanel departments={data?.departments ?? []} />

          {hasPeople || isLoading ? (
            <PayrollHistoryPanel runs={data?.payroll_history ?? []} onCreateRun={() => setRunOpen(true)} />
          ) : (
            <PayrollHistoryPanel runs={[]} onCreateRun={() => setRunOpen(true)} />
          )}
        </div>

        <div className="space-y-4">
          <PayrollIntelligencePanel insight={data?.ai_insight} />
          <UpcomingPaymentsPanel upcoming={data?.upcoming ?? []} />
        </div>
      </div>

      <PayrollRunCreateDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        employees={data?.employees ?? []}
        contractors={data?.contractors ?? []}
        loading={createRun.isPending}
        onSubmit={(payload) => createRun.mutate(payload)}
      />

      <AddCompensationDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        teamMembers={members}
        loading={createProfile.isPending}
        onSubmit={(body) => createProfile.mutate(body)}
      />
    </div>
  );
}
