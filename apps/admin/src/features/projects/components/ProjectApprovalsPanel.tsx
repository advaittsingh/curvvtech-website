import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Palette, Globe, GitBranch, Plus, Send, X, ExternalLink } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatShortDate } from "../project-schemas";

export type ApprovalRequest = {
  id: string;
  entity_type: string;
  title: string;
  description: string | null;
  review_url: string | null;
  status: string;
  created_at: string;
  decided_at?: string | null;
  comment?: string | null;
};

const QUICK_TYPES = [
  {
    entity_type: "design",
    label: "Design review",
    icon: Palette,
    title: "Design review",
    description: "Please review the latest design and approve or request changes.",
  },
  {
    entity_type: "frontend",
    label: "Site / frontend update",
    icon: Globe,
    title: "Frontend update ready for review",
    description: "We updated the live site frontend — please review and approve.",
  },
  {
    entity_type: "change",
    label: "Changes made",
    icon: GitBranch,
    title: "Project changes for your approval",
    description: "We've made changes to the project — please review and confirm.",
  },
] as const;

const ALL_TYPES = [
  ...QUICK_TYPES.map((q) => ({ value: q.entity_type, label: q.label })),
  { value: "milestone", label: "Milestone sign-off" },
  { value: "file", label: "Document / file" },
  { value: "change_order", label: "Change order" },
  { value: "deliverable", label: "Deliverable handover" },
  { value: "scope", label: "Scope update" },
  { value: "other", label: "Other" },
];

function typeLabel(entityType: string): string {
  return ALL_TYPES.find((t) => t.value === entityType)?.label ?? entityType.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

type Props = { projectId: string };

export function ProjectApprovalsPanel({ projectId }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState("design");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "approvals", projectId],
    queryFn: () => api.approvals.list({ project_id: projectId }) as Promise<{ approvals: ApprovalRequest[] }>,
    enabled: Boolean(projectId),
  });

  const list = Array.isArray(data?.approvals) ? data.approvals : [];
  const pending = list.filter((a) => a.status === "pending");

  const create = useMutation({
    mutationFn: (body: {
      project_id: string;
      entity_type: string;
      entity_id?: string;
      title: string;
      description?: string;
      review_url?: string;
    }) => api.approvals.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "approvals", projectId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setReviewUrl("");
      toast({
        title: "Sent for client approval",
        description: "The client will see this in their portal under Approvals.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Could not send approval request", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.approvals.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "approvals", projectId] });
      toast({ title: "Approval request deleted permanently" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete approval request", description: error.message, variant: "destructive" });
    },
  });

  function applyQuick(q: (typeof QUICK_TYPES)[number]) {
    setEntityType(q.entity_type);
    setTitle(q.title);
    setDescription(q.description);
    setReviewUrl("");
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      project_id: projectId,
      entity_type: entityType,
      title: title.trim(),
      description: description.trim() || undefined,
      review_url: reviewUrl.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {QUICK_TYPES.map((q) => {
          const Icon = q.icon;
          return (
            <Button
              key={q.entity_type}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => applyQuick(q)}
            >
              <Icon className="h-3.5 w-3.5" />
              {q.label}
            </Button>
          );
        })}
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setOpen(!open)}>
          <Plus className="h-3.5 w-3.5" />
          Custom request
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Send className="h-4 w-4 text-primary" />
            Request client approval
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                className="mt-1 h-9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs approval?"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Message to client</Label>
            <Textarea
              className="mt-1 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what changed and what you need them to review…"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Link to review (optional)</Label>
            <Input
              className="mt-1 h-9"
              type="url"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="https://staging.example.com or Figma / preview link"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Clients can open this URL from their portal to review the specific change.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim() || create.isPending}>
              {create.isPending ? "Sending…" : "Send to client portal"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <BackendErrorAlert error={error as Error} />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Loading approvals…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">No approval requests yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Send design, frontend, or change approvals — clients respond in their portal.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{a.title}</p>
                    <Badge variant={statusVariant(a.status)} className="capitalize shrink-0">
                      {a.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {typeLabel(a.entity_type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sent {formatShortDate(a.created_at)}
                    {a.decided_at ? ` · Decided ${formatShortDate(a.decided_at)}` : ""}
                  </p>
                  {a.description && <p className="text-sm text-muted-foreground mt-2">{a.description}</p>}
                  {a.review_url && (
                    <a
                      href={a.review_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {a.review_url}
                    </a>
                  )}
                  {a.comment && (
                    <p className="text-sm mt-2 rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">Client: </span>
                      {a.comment}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${a.title} permanently`}
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {pending.length} pending — waiting on the client in their portal → Approvals.
        </p>
      )}
    </div>
  );
}
