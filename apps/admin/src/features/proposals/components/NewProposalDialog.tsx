import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PROPOSAL_TEMPLATES } from "../constants";
import { formatInr } from "../constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type LeadOption = { id: string; name?: string; company?: string; deal_value_cents?: number; project_type?: string };
type ClientOption = { id: string; name?: string; company?: string };
type ContextPreview = {
  client_name?: string;
  project_type?: string;
  deal_value_cents?: number;
  requirements?: string;
  message?: string;
  lead_notes?: string;
  client_notes?: string;
  lead_status?: string;
  source?: string;
  active_projects?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeadId?: string;
  defaultClientId?: string;
};

export function NewProposalDialog({ open, onOpenChange, defaultLeadId, defaultClientId }: Props) {
  const api = useAdminApi();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    template_key: "shopify",
    lead_id: defaultLeadId ?? "",
    client_id: defaultClientId ?? "",
    generate_ai: true,
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        lead_id: defaultLeadId ?? "",
        client_id: defaultClientId ?? "",
      }));
    }
  }, [open, defaultLeadId, defaultClientId]);

  const { data: leads } = useQuery({
    queryKey: ["admin", "leads", "picker"],
    queryFn: () => api.leads.list(),
    enabled: open,
  });

  const { data: clients } = useQuery({
    queryKey: ["admin", "clients", "picker"],
    queryFn: () => api.clients.list("active"),
    enabled: open,
  });

  const leadList = useMemo(() => (Array.isArray(leads) ? leads : []) as LeadOption[], [leads]);
  const clientList = useMemo(() => (Array.isArray(clients) ? clients : []) as ClientOption[], [clients]);

  const { data: contextPreview, isFetching: contextLoading } = useQuery({
    queryKey: ["admin", "proposals", "context-preview", form.lead_id, form.client_id],
    queryFn: () =>
      api.proposals.contextPreview({
        lead_id: form.lead_id || undefined,
        client_id: form.client_id || undefined,
      }) as Promise<ContextPreview>,
    enabled: open && Boolean(form.lead_id || form.client_id),
  });

  useEffect(() => {
    if (!contextPreview || "error" in contextPreview) return;
    setForm((f) => ({
      ...f,
      client_name: f.client_name || contextPreview.client_name || "",
      title: f.title || (contextPreview.client_name ? `${contextPreview.client_name} Proposal` : ""),
    }));
  }, [contextPreview]);

  const create = useMutation({
    mutationFn: () =>
      api.proposals.createFromTemplate({
        template_key: form.template_key,
        client_name: form.client_name || contextPreview?.client_name,
        title: form.title || undefined,
        lead_id: form.lead_id || undefined,
        client_id: form.client_id || undefined,
        generate_ai: form.generate_ai,
      }),
    onSuccess: (p: { id?: string }) => {
      onOpenChange(false);
      if (p?.id) {
        toast({
          title: form.generate_ai ? "Proposal generated" : "Proposal created",
          description: form.generate_ai
            ? "AI filled sections using lead & client context."
            : "Open the builder to customize sections.",
        });
        navigate(`/proposals/${p.id}`);
      }
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create proposal", description: e.message, variant: "destructive" });
    },
  });

  const preview = contextPreview && !("error" in contextPreview) ? contextPreview : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New proposal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={form.template_key} onValueChange={(v) => setForm({ ...form, template_key: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPOSAL_TEMPLATES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Link to lead (optional)</Label>
            <Select
              value={form.lead_id || "__none__"}
              onValueChange={(v) => setForm({ ...form, lead_id: v === "__none__" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Select lead…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No lead</SelectItem>
                {leadList.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.company || l.name || l.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Link to client (optional)</Label>
            <Select
              value={form.client_id || "__none__"}
              onValueChange={(v) => setForm({ ...form, client_id: v === "__none__" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No client</SelectItem>
                {clientList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? c.company ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(preview || contextLoading) && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Context from CRM
              </p>
              {contextLoading ? (
                <p className="text-muted-foreground text-xs">Loading context…</p>
              ) : preview ? (
                <dl className="space-y-1.5 text-xs">
                  {preview.client_name && <div><dt className="text-muted-foreground inline">Client: </dt><dd className="inline font-medium">{preview.client_name}</dd></div>}
                  {preview.project_type && <div><dt className="text-muted-foreground inline">Project: </dt><dd className="inline">{preview.project_type}</dd></div>}
                  {(preview.deal_value_cents ?? 0) > 0 && (
                    <div><dt className="text-muted-foreground inline">Deal value: </dt><dd className="inline font-medium">{formatInr(preview.deal_value_cents)}</dd></div>
                  )}
                  {preview.lead_status && <div><dt className="text-muted-foreground inline">Stage: </dt><dd className="inline">{preview.lead_status.replace(/_/g, " ")}</dd></div>}
                  {preview.requirements && <div><dt className="text-muted-foreground">Requirements</dt><dd className="text-muted-foreground line-clamp-2">{preview.requirements}</dd></div>}
                  {preview.lead_notes && <div><dt className="text-muted-foreground">Lead notes</dt><dd className="text-muted-foreground line-clamp-2">{preview.lead_notes.slice(0, 120)}…</dd></div>}
                  {preview.client_notes && <div><dt className="text-muted-foreground">Client notes</dt><dd className="text-muted-foreground line-clamp-2">{preview.client_notes.slice(0, 120)}…</dd></div>}
                </dl>
              ) : null}
            </div>
          )}

          <div>
            <Label>Client name</Label>
            <Input
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="Auto-filled from lead/client"
            />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Auto from template"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={form.generate_ai}
              onCheckedChange={(v) => setForm({ ...form, generate_ai: Boolean(v) })}
            />
            <span>Generate with AI using lead & client context</span>
          </label>

          <Button className="w-full gap-2" disabled={create.isPending} onClick={() => create.mutate()}>
            <Sparkles className="h-4 w-4" />
            {create.isPending
              ? form.generate_ai ? "Generating proposal…" : "Creating…"
              : form.generate_ai ? "Create & generate" : "Create from template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
