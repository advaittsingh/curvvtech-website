import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi } from "../api";
import { PageHeader, EmptyState } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ServicesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["cms", "services"], queryFn: contentApi.services.list });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", hero: "", features: "", process: "", pricing: "", faq: "" });

  const save = useMutation({
    mutationFn: () => contentApi.services.upsert(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cms", "services"] }); setEditing(false); },
  });

  const items = data ?? [];

  return (
    <div className="p-6">
      <PageHeader title="Services" description="Website service pages — hero, features, process, pricing, FAQ." action={<Button size="sm" onClick={() => setEditing(true)}>Add service</Button>} />
      {items.length === 0 && !editing ? (
        <EmptyState title="No services" description="Create your first service page content block." cta={<Button onClick={() => setEditing(true)}>Add service</Button>} />
      ) : (
        <ul className="space-y-3 mb-6">
          {items.map((s) => (
            <li key={s.id} className="rounded-lg border border-stone-200 p-4">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-stone-500">Updated {new Date(s.updatedAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="rounded-lg border border-stone-200 p-4 space-y-3 max-w-xl">
          {(["title", "hero", "features", "process", "pricing", "faq"] as const).map((field) => (
            <div key={field}>
              <Label className="capitalize">{field}</Label>
              {field === "title" ? (
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              ) : (
                <Textarea value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} rows={2} />
              )}
            </div>
          ))}
          <Button onClick={() => save.mutate()} disabled={!form.title}>Save</Button>
        </div>
      )}
    </div>
  );
}
