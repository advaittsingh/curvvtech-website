import type { CollectionPipeline, PaymentsCashflow, PaymentSource } from "../payments-schemas";
import { formatInr } from "../payments-schemas";

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent ?? ""}`}>{value}</span>
    </div>
  );
}

export function CashflowPanel({ cashflow }: { cashflow: PaymentsCashflow | undefined }) {
  return (
    <PanelCard title="Cashflow">
      <Row label="Collected this week" value={formatInr(cashflow?.collected_this_week_cents)} />
      <Row label="Collected this month" value={formatInr(cashflow?.collected_this_month_cents)} />
      <Row label="Average invoice value" value={formatInr(cashflow?.avg_invoice_cents)} />
      <Row label="Collection rate" value={cashflow ? `${cashflow.collection_rate}%` : "—"} />
    </PanelCard>
  );
}

export function CollectionPipelinePanel({ pipeline }: { pipeline: CollectionPipeline | undefined }) {
  return (
    <PanelCard title="Collection pipeline">
      <Row label="Overdue" value={formatInr(pipeline?.overdue_cents)} accent="text-red-600" />
      <Row label="Due this week" value={formatInr(pipeline?.due_this_week_cents)} accent="text-amber-700" />
      <Row label="Due this month" value={formatInr(pipeline?.due_this_month_cents)} />
      <Row label="Future" value={formatInr(pipeline?.future_cents)} accent="text-muted-foreground" />
    </PanelCard>
  );
}

export function PaymentSourcesPanel({ sources }: { sources: PaymentSource[] }) {
  return (
    <PanelCard title="Payment sources">
      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sources appear once payments are recorded.</p>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.source}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{s.source}</span>
                <span className="text-muted-foreground tabular-nums">{s.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(s.pct, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}
