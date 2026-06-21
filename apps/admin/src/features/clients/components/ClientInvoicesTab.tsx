import { Link } from "react-router-dom";
import { Download, Bell, CheckCircle2 } from "lucide-react";
import type { ClientInvoice } from "../schemas";
import { formatInr, INVOICE_STATUS_COLORS } from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminApi } from "@/hooks/useAdminApi";

type Props = {
  invoices: ClientInvoice[];
  totalBilled: number;
  totalReceived: number;
  outstanding: number;
  onMarkPaid: (id: string) => void;
  onSendReminder: () => void;
  markPaidLoading?: string;
};

export function ClientInvoicesTab({
  invoices,
  totalBilled,
  totalReceived,
  outstanding,
  onMarkPaid,
  onSendReminder,
  markPaidLoading,
}: Props) {
  const api = useAdminApi();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total billed" value={formatInr(totalBilled)} />
        <SummaryCard label="Total received" value={formatInr(totalReceived)} />
        <SummaryCard label="Outstanding" value={formatInr(outstanding)} highlight />
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">No invoices yet.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left font-medium px-4 py-3">Invoice</th>
                <th className="text-left font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const st = String(inv.status ?? "draft");
                return (
                  <tr key={inv.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.invoice_number || `INV-${inv.id.slice(0, 6)}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatInr(inv.total_cents)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={INVOICE_STATUS_COLORS[st] ?? INVOICE_STATUS_COLORS.draft}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end flex-wrap gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/invoices/${inv.id}`}>View</Link>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={api.invoices.pdfUrl(inv.id)} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5 mr-1" /> PDF
                          </a>
                        </Button>
                        {st !== "paid" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={onSendReminder}>
                              <Bell className="h-3.5 w-3.5 mr-1" /> Remind
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={markPaidLoading === inv.id}
                              onClick={() => onMarkPaid(inv.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Paid
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
