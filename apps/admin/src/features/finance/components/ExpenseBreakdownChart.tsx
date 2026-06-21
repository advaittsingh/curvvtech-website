import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ExpenseCategoryBreakdown } from "../expense-schemas";
import { CATEGORY_COLORS, categoryLabel, formatInr } from "../expense-schemas";

type Props = {
  categories: ExpenseCategoryBreakdown[];
};

export function ExpenseBreakdownChart({ categories }: Props) {
  const data = categories.map((c) => ({
    name: categoryLabel(c.category),
    value: c.amount_cents,
    pct: c.pct,
    fill: CATEGORY_COLORS[c.category] ?? "#94a3b8",
  }));

  const chartConfig = Object.fromEntries(
    categories.map((c) => [
      c.category,
      { label: categoryLabel(c.category), color: CATEGORY_COLORS[c.category] ?? "#94a3b8" },
    ]),
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-1">Expense breakdown</p>
      <p className="text-xs text-muted-foreground mb-3">Last 3 months by category</p>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
          Categories appear once expenses are recorded.
        </div>
      ) : (
        <>
          <ChartContainer config={chartConfig} className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatInr(Number(value))}
                    />
                  }
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {categories.slice(0, 6).map((c) => (
              <div key={c.category} className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground truncate">{categoryLabel(c.category)}</span>
                <span className="font-medium tabular-nums shrink-0">{c.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ExpenseCategoryCards({ categories }: Props) {
  if (categories.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {categories.slice(0, 5).map((c) => (
        <div key={c.category} className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {categoryLabel(c.category)}
          </p>
          <p className="text-lg font-semibold mt-0.5 tabular-nums">{formatInr(c.amount_cents)}</p>
        </div>
      ))}
    </div>
  );
}
