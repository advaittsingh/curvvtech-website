import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi } from "../api";
import { PageHeader, EmptyState } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function PortfolioPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["cms", "portfolio"], queryFn: contentApi.portfolio.list });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", caseStudy: "", images: "", results: "", testimonial: "" });

  const save = useMutation({
    mutationFn: () => contentApi.portfolio.upsert(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cms", "portfolio"] }); setEditing(false); },
  });

  const items = data ?? [];

  return (
    <div className="p-6">
      <PageHeader title="Portfolio" description="Case studies, results, and testimonials." action={<Button size="sm" onClick={() => setEditing(true)}>Add case study</Button>} />
      {items.length === 0 && !editing ? (
        <EmptyState title="No case studies" cta={<Button onClick={() => setEditing(true)}>Add case study</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {items.map((p) => (
            <div key={p.id} className="rounded-lg border border-stone-200 p-4">
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-stone-600 mt-2 line-clamp-3">{p.caseStudy}</p>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="rounded-lg border border-stone-200 p-4 space-y-3 max-w-xl">
          {(["title", "caseStudy", "images", "results", "testimonial"] as const).map((field) => (
            <div key={field}>
              <Label className="capitalize">{field}</Label>
              {field === "title" ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /> : <Textarea value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />}
            </div>
          ))}
          <Button onClick={() => save.mutate()} disabled={!form.title}>Save</Button>
        </div>
      )}
    </div>
  );
}
