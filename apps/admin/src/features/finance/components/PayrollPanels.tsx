import { Badge } from "@/components/ui/badge";
import type { CompensationProfile, PayrollRun, UpcomingPayment } from "../payroll-schemas";
import { departmentLabel, formatInr, formatShortDate } from "../payroll-schemas";

export function EmployeePayrollTable({ employees }: { employees: CompensationProfile[] }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Employees</p>
      </div>
      {employees.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">No employees on payroll yet. Add compensation profiles linked to team members.</p>
      ) : (
        <div className="divide-y divide-border">
          {employees.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30">
              <div>
                <p className="font-medium">{e.display_name ?? e.name}</p>
                <p className="text-xs text-muted-foreground">
                  {e.role_title ?? "Team member"}
                  {e.department ? ` · ${departmentLabel(e.department)}` : ""}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatInr(e.monthly_salary_cents)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContractorsPanel({ contractors }: { contractors: CompensationProfile[] }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Contractors</p>
      </div>
      {contractors.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">No contractors tracked. Add retainer-based contractors here.</p>
      ) : (
        <div className="divide-y divide-border">
          {contractors.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role_title ?? "Contractor"}</p>
              </div>
              <p className="font-semibold tabular-nums">{formatInr(c.monthly_salary_cents)}/mo</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UpcomingPaymentsPanel({ upcoming }: { upcoming: UpcomingPayment[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-3">Upcoming payments</p>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming payouts scheduled.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.slice(0, 8).map((u) => (
            <div key={`${u.kind}-${u.id}`} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {u.due_date ? formatShortDate(u.due_date) : "TBD"}
                </p>
                <p className="text-sm font-medium mt-0.5">{u.title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{formatInr(u.amount_cents)}</p>
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  {u.status ?? "scheduled"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PayrollHistoryPanel({
  runs,
  onCreateRun,
}: {
  runs: PayrollRun[];
  onCreateRun: () => void;
}) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 shadow-sm text-center">
        <p className="text-base font-semibold">No payroll runs yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Create payroll runs for employees and contractors. Generate payslips, track compensation, and monitor payroll costs.
        </p>
        <button
          type="button"
          onClick={onCreateRun}
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create payroll run
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Payroll history</p>
      </div>
      <div className="divide-y divide-border">
        {runs.map((r) => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{r.period_label ?? `${r.period_start} → ${r.period_end}`}</p>
              <Badge variant="secondary" className="text-[10px] mt-1">
                {r.status}
              </Badge>
            </div>
            <p className="font-semibold tabular-nums">{formatInr(r.total_cents)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
