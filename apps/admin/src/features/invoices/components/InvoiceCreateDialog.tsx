import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVOICE_TYPES, MILESTONE_SPLITS, formatInr, generateInvoiceNumber, type InvoiceTypeId } from "../invoice-schemas";

type Client = { id: string; name?: string; company?: string };
type Project = { id: string; name?: string; client_id?: string; budget_cents?: number };

export type CreateInvoicePayload = {
  client_id: string;
  project_id?: string;
  invoice_number: string;
  invoice_type: InvoiceTypeId;
  amount_cents: number;
  line_description?: string;
  due_at?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  projects: Project[];
  onCreate: (payload: CreateInvoicePayload) => void;
  loading?: boolean;
};

export function InvoiceCreateDialog({ open, onOpenChange, clients, projects, onCreate, loading }: Props) {
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeId>("milestone");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [lineDescription, setLineDescription] = useState("");

  const clientProjects = useMemo(
    () => projects.filter((p) => !clientId || p.client_id === clientId),
    [projects, clientId],
  );

  const selectedProject = projects.find((p) => p.id === projectId);
  const budget = Number(selectedProject?.budget_cents ?? 0);

  const paidOnProject = 0;
  const pendingBudget = Math.max(0, budget - paidOnProject);

  function reset() {
    setStep(1);
    setClientId("");
    setProjectId("");
    setInvoiceType("milestone");
    setInvoiceNumber("");
    setAmount("");
    setLineDescription("");
  }

  function applySplit(pct: number, type: InvoiceTypeId, label: string) {
    if (!budget) return;
    const cents = Math.round((budget * pct) / 100);
    setAmount(String(cents / 100));
    setInvoiceType(type);
    setLineDescription(label);
    setStep(2);
  }

  function submit() {
    onCreate({
      client_id: clientId,
      project_id: projectId || undefined,
      invoice_number: invoiceNumber || generateInvoiceNumber(),
      invoice_type: invoiceType,
      amount_cents: Math.round(Number(amount || 0) * 100),
      line_description: lineDescription || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>
            Step {step} of 2 — {step === 1 ? "Client & project" : "Amount & billing"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              <Select
                value={clientId || "none"}
                onValueChange={(v) => {
                  setClientId(v === "none" ? "" : v);
                  setProjectId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select client…</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company ?? c.name ?? c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name ?? p.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice type</Label>
              <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as InvoiceTypeId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!clientId} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedProject && budget > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium">{selectedProject.name}</p>
                <p className="text-muted-foreground">Project budget: {formatInr(budget)}</p>
                <p className="text-muted-foreground">Pending: {formatInr(pendingBudget)}</p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {MILESTONE_SPLITS.map((s) => (
                    <Button
                      key={s.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => applySplit(s.pct, s.type, s.label)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Invoice number</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={generateInvoiceNumber()}
              />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Line description</Label>
              <Input value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} placeholder="e.g. 20% Advance" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" disabled={!amount || loading} onClick={submit}>
                Create invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
