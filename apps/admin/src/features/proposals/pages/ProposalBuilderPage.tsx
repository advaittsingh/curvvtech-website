import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Link2 } from "lucide-react";
import { proposalsApi } from "../api";
import { PageHeader } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ProposalBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: proposal } = useQuery({ queryKey: ["proposals", id], queryFn: () => proposalsApi.get(id!), enabled: Boolean(id) });

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof proposalsApi.update>[1]) => proposalsApi.update(id!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals", id] }),
  });

  if (!proposal) return <div className="p-6 text-stone-500">Proposal not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <Link to="/proposals" className="inline-flex items-center gap-1 text-sm text-stone-600"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <PageHeader
        title={proposal.title}
        description={proposal.clientName}
        action={
          <div className="flex gap-2">
            <Select value={proposal.status} onValueChange={(status) => save.mutate({ status: status as typeof proposal.status })}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "sent", "viewed", "approved", "rejected"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(proposalsApi.shareLink(proposal)); toast({ title: "Link copied" }); }}>
              <Link2 className="h-4 w-4" /> Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> PDF</Button>
          </div>
        }
      />
      <div className="space-y-4">
        {proposal.sections.map((section, idx) => (
          <div key={section.id} className="rounded-lg border border-stone-200 p-4">
            <h3 className="font-medium text-stone-900 mb-2">{section.title}</h3>
            <Textarea
              value={section.content}
              rows={4}
              onChange={(e) => {
                const sections = [...proposal.sections];
                sections[idx] = { ...section, content: e.target.value };
                save.mutate({ sections });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
