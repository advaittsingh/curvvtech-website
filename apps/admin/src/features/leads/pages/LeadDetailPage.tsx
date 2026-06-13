import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useLeadMutations, useLeads } from "../hooks/useLeads";
import { PageHeader } from "@/components/system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const { data: list } = useLeads();
  const { update } = useLeadMutations();
  const [note, setNote] = useState("");

  const lead = Array.isArray(list) ? list.find((l: { id: string }) => l.id === id) : null;

  const { data: notes } = useQuery({
    queryKey: ["admin", "leads", id, "notes"],
    queryFn: () => api.leads.notes(id!),
    enabled: Boolean(id),
  });

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-stone-500">Lead not found.</p>
        <Link to="/leads" className="text-sm text-stone-700 underline mt-2 inline-block">Back to leads</Link>
      </div>
    );
  }

  const noteList = Array.isArray(notes) ? notes : [];

  return (
    <div className="p-6 space-y-6">
      <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <PageHeader
        title={lead.name ?? lead.email ?? "Lead"}
        description={[lead.company, lead.email].filter(Boolean).join(" · ")}
        action={
          <Select
            value={String(lead.status ?? "new")}
            onValueChange={(status) => update.mutate({ id: lead.id, body: { status } })}
          >
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["new", "contacted", "in_discussion", "proposal_sent", "won", "closed"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-stone-200 p-4 space-y-2">
          <p className="text-stone-500">Phone</p>
          <p className="font-medium">{lead.phone ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 p-4 space-y-2">
          <p className="text-stone-500">Source</p>
          <p className="font-medium">{lead.source ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 p-4 space-y-2">
          <p className="text-stone-500">Status</p>
          <Badge>{String(lead.status ?? "new").replace(/_/g, " ")}</Badge>
        </div>
      </div>

      {lead.message && (
        <div className="rounded-lg border border-stone-200 p-4">
          <p className="text-sm text-stone-500 mb-1">Message</p>
          <p className="text-stone-800">{lead.message}</p>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 p-4">
        <h3 className="font-medium text-stone-900 mb-3">Notes</h3>
        <div className="flex gap-2 mb-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
          <Button
            className="shrink-0"
            disabled={!note.trim()}
            onClick={async () => {
              await api.leads.addNote(lead.id, { body: note, is_internal: true });
              setNote("");
            }}
          >
            Add
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {noteList.map((n: { id: string; body?: string; createdAt?: string }) => (
            <li key={n.id} className="border-b border-stone-100 pb-2">
              <p>{n.body}</p>
              {n.createdAt && <p className="text-xs text-stone-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
