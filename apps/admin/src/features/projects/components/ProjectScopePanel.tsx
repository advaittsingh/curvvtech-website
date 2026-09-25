import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectScopeItem } from "../project-schemas";
import { formatInr } from "../project-schemas";

const CATEGORIES = [
  { id: "included", label: "Included", color: "border-emerald-500/30 bg-emerald-500/5" },
  { id: "excluded", label: "Not included", color: "border-muted bg-muted/20" },
  { id: "future", label: "Future scope", color: "border-blue-500/30 bg-blue-500/5" },
  { id: "extra", label: "Extra charges", color: "border-amber-500/30 bg-amber-500/5" },
] as const;

type Props = { projectId: string };

export function ProjectScopePanel({ projectId }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [adding, setAdding] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "projects", projectId, "scope"],
    queryFn: () => api.projects.scope(projectId) as Promise<ProjectScopeItem[]>,
  });
  const items = Array.isArray(data) ? data : [];

  const add = useMutation({
    mutationFn: (category: string) => api.projects.addScopeItem(projectId, { category, title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "scope"] });
      setTitle("");
      setAdding(null);
    },
  });

  const remove = useMutation({
    mutationFn: (sid: string) => api.projects.removeScopeItem(projectId, sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "scope"] }),
  });

  const extraTotal = items.filter((i) => i.category === "extra").reduce((s, i) => s + Number(i.cost_cents ?? 0), 0);

  return (
    <div className="space-y-4">
      {extraTotal > 0 && (
        <p className="text-sm text-amber-700 font-medium">Scope creep exposure: {formatInr(extraTotal)} in extra charges</p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat.id);
          return (
            <section key={cat.id} className={`rounded-xl border p-4 ${cat.color}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">{cat.label}</h4>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAdding(cat.id)}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
              {adding === cat.id && (
                <div className="flex gap-2 mb-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add item…" className="h-8 text-sm" />
                  <Button size="sm" className="h-8" disabled={!title} onClick={() => add.mutate(cat.id)}>Add</Button>
                </div>
              )}
              <ul className="space-y-1.5">
                {catItems.length === 0 ? (
                  <li className="text-xs text-muted-foreground">Empty</li>
                ) : catItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm gap-2 group">
                    <span>{item.title}</span>
                    <div className="flex items-center gap-1">
                      {item.cost_cents ? <span className="text-xs text-muted-foreground">{formatInr(item.cost_cents)}</span> : null}
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
