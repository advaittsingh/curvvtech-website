import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExpenseRecord } from "../expense-schemas";
import { categoryLabel, formatExpenseDateLabel, formatInr } from "../expense-schemas";

type Props = {
  expenses: ExpenseRecord[];
  isLoading?: boolean;
  onAddExpense: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (id: string) => void;
};

function groupByDate(expenses: ExpenseRecord[]): Map<string, ExpenseRecord[]> {
  const map = new Map<string, ExpenseRecord[]>();
  for (const e of expenses) {
    const label = formatExpenseDateLabel(e.expense_date);
    const list = map.get(label) ?? [];
    list.push(e);
    map.set(label, list);
  }
  return map;
}

export function ExpenseTimeline({ expenses, isLoading, onAddExpense, onEdit, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Loading expenses…</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 shadow-sm text-center">
        <p className="text-base font-semibold">No expenses recorded yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Track software subscriptions, contractor payments, marketing spend, and operational costs.
        </p>
        <button
          type="button"
          onClick={onAddExpense}
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add expense
        </button>
      </div>
    );
  }

  const grouped = groupByDate(expenses);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Recent expenses</p>
      </div>
      <div className="divide-y divide-border">
        {[...grouped.entries()].map(([dateLabel, items]) => (
          <div key={dateLabel} className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{dateLabel}</p>
            <div className="space-y-2">
              {items.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{e.vendor || e.description}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {categoryLabel(e.category)}
                      </Badge>
                    </div>
                    {e.vendor && e.description !== e.vendor && (
                      <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>
                    )}
                    {e.project_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Project: <span className="text-foreground">{e.project_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <p className="text-sm font-semibold tabular-nums mr-2">{formatInr(e.amount_cents)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectProfitabilityPanel({
  projects,
}: {
  projects: { id: string; name: string; revenue_cents: number; expense_cents: number; profit_cents: number; margin_pct: number }[];
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold mb-2">Project profitability</p>
        <p className="text-sm text-muted-foreground">
          Link expenses to projects to see per-project margins.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-3">Project profitability</p>
      <div className="space-y-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="block rounded-lg border border-border/60 px-3 py-2.5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Revenue {formatInr(p.revenue_cents)} · Expenses {formatInr(p.expense_cents)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums text-emerald-700">{p.margin_pct}%</p>
                <p className="text-xs text-muted-foreground">margin</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(Math.max(p.margin_pct, 0), 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
