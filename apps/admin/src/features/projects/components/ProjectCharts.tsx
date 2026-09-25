import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProjectInvoice, ProjectSummary, ProjectTask } from "../project-schemas";
import { formatInr } from "../project-schemas";

type Props = {
  summary: ProjectSummary | null | undefined;
  invoices: ProjectInvoice[];
  tasks: ProjectTask[];
};

export function ProjectCharts({ summary, invoices, tasks }: Props) {
  const budget = summary?.budget_cents ?? 0;
  const collected = summary?.collected_cents ?? 0;
  const pending = summary?.pending_cents ?? 0;
  const expenses = summary?.expense_cents ?? 0;

  const budgetData = [
    { name: "Collected", value: collected, fill: "#10b981" },
    { name: "Pending", value: pending, fill: "#f59e0b" },
    { name: "Expenses", value: expenses, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  const taskDone = tasks.filter((t) => t.status === "done" || t.status === "completed").length;
  const taskOpen = tasks.length - taskDone;
  const taskData = [
    { name: "Done", value: taskDone, fill: "#6366f1" },
    { name: "Open", value: taskOpen, fill: "#e5e7eb" },
  ];

  const paymentTimeline = invoices
    .filter((i) => i.paid_at)
    .slice(0, 6)
    .map((i) => ({
      name: i.invoice_number?.slice(-6) ?? "Pay",
      amount: Number(i.total_cents ?? 0) / 100,
    }));

  return (
    <div className="grid md:grid-cols-3 gap-3">
      <ChartCard title="Budget vs collected">
        {budgetData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={budgetData} dataKey="value" innerRadius={40} outerRadius={58} paddingAngle={2}>
                {budgetData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatInr(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-center text-muted-foreground mt-1">Budget {formatInr(budget)}</p>
      </ChartCard>

      <ChartCard title="Task completion">
        {tasks.length === 0 ? (
          <EmptyChart label="No tasks yet" />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={taskData} dataKey="value" innerRadius={40} outerRadius={58}>
                {taskData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-center text-muted-foreground mt-1">{taskDone}/{tasks.length} complete</p>
      </ChartCard>

      <ChartCard title="Payment timeline">
        {paymentTimeline.length === 0 ? (
          <EmptyChart label="No payments logged" />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={paymentTimeline}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}

function EmptyChart({ label = "No data" }: { label?: string }) {
  return <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">{label}</div>;
}
