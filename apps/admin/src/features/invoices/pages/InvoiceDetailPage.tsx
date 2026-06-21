import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Link2, Plus, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { authFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  InvoiceActivityTimeline,
  InvoiceAiInsightPanel,
  InvoiceDetailHeaderCard,
  InvoiceFinanceSummary,
  InvoiceTotalsCard,
} from "../components/InvoiceDetailPanels";
import type {
  InvoiceFinanceInsight,
  InvoiceRecord,
  InvoiceTimelineEvent,
} from "../invoice-schemas";
import { formatDueLabel, formatInr, invoiceStatus, invoiceTotal } from "../invoice-schemas";

type LineItem = {
  id: string;
  description?: string;
  quantity?: number;
  unit_price_cents?: number;
  tax_percent?: number;
  discount_cents?: number;
};

type ItemForm = {
  description: string;
  quantity: string;
  rate: string;
  tax_percent: string;
  discount: string;
};

const emptyForm = (): ItemForm => ({
  description: "",
  quantity: "1",
  rate: "",
  tax_percent: "18",
  discount: "0",
});

function lineSubtotal(item: LineItem) {
  const qty = Number(item.quantity ?? 1);
  return qty * Number(item.unit_price_cents ?? 0);
}

function lineTax(item: LineItem) {
  return Math.round(lineSubtotal(item) * (Number(item.tax_percent ?? 0) / 100));
}

function lineTotal(item: LineItem) {
  return (lineSubtotal(item) + lineTax(item) - Number(item.discount_cents ?? 0)) / 100;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [aiLoading, setAiLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm());

  const { data: invoice, error } = useQuery({
    queryKey: ["admin", "invoices", id],
    queryFn: () => api.invoices.get(id!) as Promise<InvoiceRecord>,
    enabled: Boolean(id),
  });
  const { data: items } = useQuery({
    queryKey: ["admin", "invoices", id, "items"],
    queryFn: () => api.invoices.items(id!),
    enabled: Boolean(id),
  });
  const { data: timeline } = useQuery({
    queryKey: ["admin", "invoices", id, "activity"],
    queryFn: () => api.invoices.activity(id!) as Promise<InvoiceTimelineEvent[]>,
    enabled: Boolean(id),
  });
  const { data: intelligence, isLoading: intelLoading } = useQuery({
    queryKey: ["admin", "invoices", id, "intelligence"],
    queryFn: () => api.invoices.intelligence(id!) as Promise<InvoiceFinanceInsight>,
    enabled: Boolean(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "invoices", id, "items"] });
    qc.invalidateQueries({ queryKey: ["admin", "invoices", id] });
    qc.invalidateQueries({ queryKey: ["admin", "invoices", id, "activity"] });
    qc.invalidateQueries({ queryKey: ["admin", "invoices", id, "intelligence"] });
    qc.invalidateQueries({ queryKey: ["admin", "invoices", "summary"] });
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      const body = {
        description: form.description,
        quantity: Number(form.quantity || 1),
        unit_price_cents: Math.round(Number(form.rate || 0) * 100),
        tax_percent: Number(form.tax_percent || 0),
        discount_cents: Math.round(Number(form.discount || 0) * 100),
      };
      if (editingItem) return api.invoices.updateItem(id!, editingItem.id, body);
      return api.invoices.addItem(id!, body);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm());
      toast({ title: editingItem ? "Line item updated" : "Line item added" });
    },
    onError: (e: Error) => toast({ title: "Failed to save item", description: e.message, variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.invoices.removeItem(id!, itemId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Line item removed" });
    },
  });

  const addItems = useMutation({
    mutationFn: async (newItems: { description: string; quantity?: number; unit_price_cents: number; tax_percent?: number }[]) => {
      for (const item of newItems) {
        await api.invoices.addItem(id!, item);
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Line items generated from project scope" });
    },
  });

  if (error || !invoice || (typeof invoice === "object" && "error" in invoice)) {
    return <div className="p-6 text-muted-foreground">Invoice not found.</div>;
  }

  const inv = invoice as InvoiceRecord;
  const lineItems: LineItem[] = Array.isArray(items) ? items : [];
  const status = invoiceStatus(inv);
  const total = invoiceTotal(inv);
  const paid = status === "paid" ? total : 0;
  const outstanding = status === "paid" ? 0 : total;
  const projectId = inv.project_id;

  const itemsSubtotal = lineItems.reduce((s, i) => s + lineSubtotal(i), 0);
  const itemsTax = lineItems.reduce((s, i) => s + lineTax(i), 0);
  const invoiceTax = Number(inv.tax_cents ?? 0);
  const taxTotal = itemsTax + invoiceTax;
  const discount = Number(inv.discount_cents ?? 0);

  function openAdd() {
    setEditingItem(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(item: LineItem) {
    setEditingItem(item);
    setForm({
      description: item.description ?? "",
      quantity: String(item.quantity ?? 1),
      rate: String((item.unit_price_cents ?? 0) / 100),
      tax_percent: String(item.tax_percent ?? 18),
      discount: String((item.discount_cents ?? 0) / 100),
    });
    setDialogOpen(true);
  }

  async function generateFromScope() {
    setAiLoading(true);
    try {
      const res = await api.ai.invoice({
        client_id: inv.client_id,
        project_id: projectId,
        description: "Generate from project scope, milestones, and deliverables",
        amount_hint: outstanding,
      });
      const newItems = (Array.isArray(res.items) ? res.items : []) as {
        description?: string;
        quantity?: number;
        unit_price_cents?: number;
        amount_cents?: number;
        tax_percent?: number;
      }[];
      if (newItems.length === 0) {
        toast({ title: "No items generated", variant: "destructive" });
        return;
      }
      await addItems.mutateAsync(
        newItems.map((item) => ({
          description: item.description ?? "Service",
          quantity: item.quantity ?? 1,
          unit_price_cents: item.unit_price_cents ?? item.amount_cents ?? 0,
          tax_percent: item.tax_percent ?? 18,
        })),
      );
    } catch {
      toast({ title: "AI generation failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function downloadPdf() {
    const res = await authFetch(api.invoices.pdfUrl(id!), {}, getAccessToken());
    if (!res.ok) {
      toast({ title: "PDF unavailable", variant: "destructive" });
      return;
    }
    const html = await res.text();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }

  async function createPaymentLink() {
    setPaymentLoading(true);
    try {
      const res = await api.invoices.paymentLink(id!);
      if (res.error) {
        toast({ title: "Payment link failed", description: res.error, variant: "destructive" });
        return;
      }
      invalidate();
      toast({ title: "Payment link sent", description: `Order ${res.order_id}` });
    } catch {
      toast({ title: "Payment link failed", variant: "destructive" });
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to finance
      </Link>

      <InvoiceDetailHeaderCard
        invoiceNumber={String(inv.invoice_number ?? id?.slice(0, 8))}
        clientName={String(inv.client_name ?? "Client")}
        projectName={inv.project_name}
        total={formatInr(total)}
        status={status}
      />

      <InvoiceFinanceSummary
        amount={formatInr(total)}
        paid={formatInr(paid)}
        outstanding={formatInr(outstanding)}
        dueLabel={formatDueLabel(inv.due_at, status)}
      />

      {projectId && inv.project_name && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Linked project</p>
            <p className="font-semibold">{inv.project_name}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to={`/projects/${projectId}`}>
              View project <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={generateFromScope} disabled={aiLoading || addItems.isPending}>
          <Sparkles className="h-3.5 w-3.5" />
          Generate from project scope
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadPdf}>
          <Download className="h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={createPaymentLink} disabled={paymentLoading}>
          <Link2 className="h-4 w-4" /> Send payment link
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                  <th className="text-right p-3 font-medium">Tax</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No line items — generate from project scope or add manually.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3 font-medium">{item.description}</td>
                      <td className="p-3 text-right">{item.quantity ?? 1}</td>
                      <td className="p-3 text-right">{formatInr(item.unit_price_cents)}</td>
                      <td className="p-3 text-right">{item.tax_percent ?? 0}%</td>
                      <td className="p-3 text-right font-semibold">{formatInr(Math.round(lineTotal(item) * 100))}</td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem.mutate(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <InvoiceTotalsCard
            subtotal={formatInr(itemsSubtotal || inv.subtotal_cents)}
            tax={formatInr(taxTotal)}
            discount={discount ? formatInr(discount) : "—"}
            total={formatInr(total)}
          />
        </div>

        <div className="space-y-4">
          <InvoiceAiInsightPanel insight={intelligence} loading={intelLoading} />
          <InvoiceActivityTimeline events={Array.isArray(timeline) ? timeline : []} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit line item" : "Add line item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Rate (₹)</Label>
                <Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
              <div>
                <Label>Tax %</Label>
                <Input type="number" value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} />
              </div>
              <div>
                <Label>Discount (₹)</Label>
                <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" disabled={!form.description || saveItem.isPending} onClick={() => saveItem.mutate()}>
              {editingItem ? "Update item" : "Add item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
