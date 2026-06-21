import type { ClientPayment } from "../schemas";
import { formatInr, formatShortDate } from "../constants";
import { Badge } from "@/components/ui/badge";

export function ClientPaymentsTab({ payments }: { payments: ClientPayment[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Payment transactions — separate from invoice documents. Each row is money received.
      </p>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">No payments recorded yet.</p>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-card">
              <div>
                <p className="text-lg font-semibold">{formatInr(p.amount_cents)}</p>
                <p className="text-sm text-muted-foreground">
                  {p.invoice_number ? `Invoice ${p.invoice_number}` : "Payment"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>
                <span className="text-muted-foreground">{p.provider ?? "Manual"}</span>
                <span className="text-muted-foreground">{formatShortDate(p.paid_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
