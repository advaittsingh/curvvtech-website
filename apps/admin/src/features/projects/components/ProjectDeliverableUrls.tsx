import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe, Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type DeliverableUrl = {
  id: string;
  label: string;
  url: string;
  visibility?: string;
};

type Props = { projectId: string };

export function ProjectDeliverableUrls({ projectId }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [label, setLabel] = useState("Live website");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "projects", projectId, "deliverable-urls"],
    queryFn: () => api.projects.deliverableUrls(projectId) as Promise<{ urls: DeliverableUrl[] }>,
    enabled: Boolean(projectId),
  });

  const urls = Array.isArray(data?.urls) ? data.urls : [];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    try {
      await api.projects.addDeliverableUrl(projectId, { label: label.trim() || "Website", url: url.trim() });
      setUrl("");
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "deliverable-urls"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId] });
      toast({ title: "Website URL added", description: "Visible in the client portal under Deliverables." });
    } catch (err) {
      toast({ title: "Could not add URL", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(urlId: string) {
    try {
      await api.projects.removeDeliverableUrl(projectId, urlId);
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "deliverable-urls"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId] });
      toast({ title: "URL removed" });
    } catch (err) {
      toast({ title: "Could not remove URL", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Globe className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Website URLs</h4>
          <p className="text-[10px] text-muted-foreground">Published to client portal → Deliverables</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">Loading URLs…</p>
      ) : urls.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">No website URLs yet. Add live site, admin panel, or staging links.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {urls.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{u.label}</div>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary truncate block hover:underline"
                >
                  {u.url}
                </a>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={u.url} target="_blank" rel="noreferrer" title="Open">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(u.id)} title="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-end">
        <div>
          <Label className="text-xs text-muted-foreground">Label</Label>
          <Input
            className="mt-1 h-9 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Live website"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">URL</Label>
          <Input
            className="mt-1 h-9 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
        </div>
        <Button type="submit" size="sm" className="h-9 gap-1" disabled={saving || !url.trim()}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
    </div>
  );
}
