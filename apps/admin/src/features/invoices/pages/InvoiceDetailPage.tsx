import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const { data: invoice } = useQuery({ queryKey: ["admin", "invoices", id], queryFn: () => api.invoices.get(id!), enabled: Boolean(id) });
  const { data: items } = useQuery({ queryKey: ["admin", "invoices", id, "items"], queryFn: () => api.invoices.items(id!), enabled: Boolean(id) });

  if (!invoice || (typeof invoice === "object" && "error" in invoice)) {
    return <div className="p-6 text-stone-500">Invoice not found.</div>;
  }

  const inv = invoice as Record<string, unknown>;
  const lineItems = Array.isArray(items) ? items : [];

  return (
    <div className="p-6 space-y-6">
      <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-stone-600"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <PageHeader
        title={`Invoice ${String(inv.invoice_number ?? id?.slice(0, 8))}`}
        description={String(inv.client_name ?? "")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> PDF</Button>
            <Badge>{String(inv.status ?? "draft")}</Badge>
          </div>
        }
      />
      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item: { id: string; description?: string; quantity?: number; unit_price_cents?: number }) => (
              <tr key={item.id} className="border-t border-stone-100">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-right">{item.quantity ?? 1}</td>
                <td className="p-3 text-right">₹{((item.unit_price_cents ?? 0) * (item.quantity ?? 1)) / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right font-semibold text-lg">
        Total: ₹{Number(inv.total_cents ?? 0) / 100}
      </p>
    </div>
  );
}
