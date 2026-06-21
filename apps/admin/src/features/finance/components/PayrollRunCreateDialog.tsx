import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompensationProfile } from "../payroll-schemas";
import { formatInr } from "../payroll-schemas";

export type CreatePayrollRunPayload = {
  period_start: string;
  period_end: string;
  period_label: string;
  profile_ids: string[];
  generate_payslips: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: CompensationProfile[];
  contractors: CompensationProfile[];
  loading?: boolean;
  onSubmit: (payload: CreatePayrollRunPayload) => void;
};

export function PayrollRunCreateDialog({
  open,
  onOpenChange,
  employees,
  contractors,
  loading,
  onSubmit,
}: Props) {
  const now = new Date();
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
  const monthLabel = format(now, "MMMM yyyy");

  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(monthEnd);
  const [periodLabel, setPeriodLabel] = useState(monthLabel);
  const [generatePayslips, setGeneratePayslips] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allProfiles = useMemo(() => [...employees, ...contractors], [employees, contractors]);

  const totalCents = allProfiles
    .filter((p) => selected.has(p.id))
    .reduce((s, p) => s + Number(p.monthly_salary_cents ?? 0), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllEmployees() {
    setSelected(new Set(employees.map((e) => e.id)));
  }

  function handleSubmit() {
    onSubmit({
      period_start: periodStart,
      period_end: periodEnd,
      period_label: periodLabel,
      profile_ids: [...selected],
      generate_payslips: generatePayslips,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create payroll run</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Payroll month</Label>
            <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>People included</Label>
              {employees.length > 0 && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={selectAllEmployees}>
                  Select all employees
                </button>
              )}
            </div>
            {allProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add compensation profiles first (employees or contractors).</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {allProfiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                    <span className="flex-1">{p.display_name ?? p.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">{formatInr(p.monthly_salary_cents)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total amount</p>
            <p className="text-lg font-semibold tabular-nums">{formatInr(totalCents)}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={generatePayslips} onCheckedChange={(v) => setGeneratePayslips(Boolean(v))} />
            Generate payslips
          </label>

          <Button
            className="w-full"
            disabled={!periodStart || !periodEnd || selected.size === 0 || loading}
            onClick={handleSubmit}
          >
            {loading ? "Running…" : "Run payroll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddCompensationDialog({
  open,
  onOpenChange,
  teamMembers,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: { user_id: string; name?: string; email?: string }[];
  loading?: boolean;
  onSubmit: (body: object) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    user_id: "",
    employment_type: "employee",
    role_title: "",
    department: "engineering",
    salary: "",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.employment_type}
              onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
            >
              <option value="employee">Employee</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          {form.employment_type === "employee" && teamMembers.length > 0 && (
            <div>
              <Label>Link team member</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.user_id}
                onChange={(e) => {
                  const m = teamMembers.find((t) => t.user_id === e.target.value);
                  setForm({
                    ...form,
                    user_id: e.target.value,
                    name: m?.name ?? m?.email ?? form.name,
                  });
                }}
              >
                <option value="">—</option>
                {teamMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name ?? m.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} />
            </div>
            <div>
              <Label>Monthly salary (₹)</Label>
              <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={!form.name || !form.salary || loading}
            onClick={() =>
              onSubmit({
                name: form.name,
                user_id: form.user_id || null,
                employment_type: form.employment_type,
                role_title: form.role_title || null,
                department: form.department,
                monthly_salary_cents: Math.round(Number(form.salary) * 100),
              })
            }
          >
            Save profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
