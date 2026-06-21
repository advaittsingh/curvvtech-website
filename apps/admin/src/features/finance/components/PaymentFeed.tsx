import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { RecentPayment } from "../payments-schemas";
import { formatInr, formatPaidLabel } from "../payments-schemas";

type Props = {
  payments: RecentPayment[];
  isLoading?: boolean;
  onCreateInvoice: () => void;
};

export function PaymentFeed({ payments, isLoading, onCreateInvoice }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Loading payments…</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 shadow-sm text-center">
        <p className="text-base font-semibold">No payments yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Create invoices and send payment links. Collections will automatically appear here.
        </p>
        <button
          type="button"
          onClick={onCreateInvoice}
          className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create invoice
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Recent payments</p>
      </div>
      <div className="divide-y divide-border">
        {payments.map((p) => (
          <div key={p.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold tabular-nums">{formatInr(p.total_cents)}</p>
                <p className="text-sm font-medium mt-0.5">{p.client_name ?? "Unknown client"}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-xs">
                  {p.source}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{formatPaidLabel(p.paid_at)}</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-muted-foreground">
              <span>
                Invoice:{" "}
                <Link to={`/invoices/${p.id}`} className="text-foreground hover:underline font-medium">
                  {p.invoice_number ?? p.id.slice(0, 8)}
                </Link>
              </span>
              {p.project_name && (
                <span>
                  Project: <span className="text-foreground">{p.project_name}</span>
                </span>
              )}
              {p.client_name && (
                <span>
                  Client: <span className="text-foreground">{p.client_name}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
