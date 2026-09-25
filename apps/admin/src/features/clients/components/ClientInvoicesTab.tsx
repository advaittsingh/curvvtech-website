import { Link } from "react-router-dom";
import { Download, Bell, CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import type { ClientInvoice } from "../schemas";
import { formatInr, INVOICE_STATUS_COLORS } from "../constants";
import { CrmEmptyState } from "@/components/crm/CrmEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminApi } from "@/hooks/useAdminApi";

type Props = {
  invoices: ClientInvoice[];
  totalBilled: number;
  totalReceived: number;
  outstanding: number;
  onMarkPaid: (id: string) => void;
  onSendReminder: (invoiceId?: string) => void;
  onCreateInvoice?: () => void;
  markPaidLoading?: string;
};

export function ClientInvoicesTab({
  invoices,
  totalBilled,
  totalReceived,
  outstanding,
  onMarkPaid,
  onSendReminder,
  onCreateInvoice,
  markPaidLoading,
}: Props) {
  const api = useAdminApi();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total billed" value={formatInr(totalBilled)} />
        <SummaryCard label="Total received" value={formatInr(totalReceived)} />
        <SummaryCard label="Outstanding" value={formatInr(outstanding)} highlight />
      </div>

      {invoices.length === 0 ? (
        <CrmEmptyState
          title="No invoices yet"
          description="Create an invoice to bill this client. PDF generation and payment tracking are built in."
          actionLabel="Create invoice"
          onAction={onCreateInvoice}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left font-medium px-4 py-3">Invoice</th>
                <th className="text-left font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const st = String(inv.status ?? "draft");
                return (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.invoice_number || `INV-${inv.id.slice(0, 6)}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatInr(inv.total_cents)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={INVOICE_STATUS_COLORS[st] ?? INVOICE_STATUS_COLORS.draft}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="View">
                          <Link to={`/invoices/${inv.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Download PDF">
                          <a href={api.invoices.pdfUrl(inv.id)} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="More">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {st !== "paid" && (
                              <>
                                <DropdownMenuItem onClick={() => onSendReminder(inv.id)}>
                                  <Bell className="h-4 w-4 mr-2" /> Send reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onMarkPaid(inv.id)} disabled={markPaidLoading === inv.id}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark paid
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
