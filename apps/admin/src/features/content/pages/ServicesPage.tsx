import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader, EmptyState } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACCENT_OPTIONS = [
  { value: "purple", label: "Purple — Web Development" },
  { value: "blue", label: "Blue — App Development" },
  { value: "orange", label: "Orange — Backend & API" },
  { value: "green", label: "Green — AI / Automation" },
  { value: "pink", label: "Pink — SaaS Products" },
  { value: "violet", label: "Violet — Custom Software" },
] as const;

const DEFAULT_SERVICES = [
  { title: "Web Development", slug: "web-development", description: "Modern, scalable web applications that perform.", icon: "/images/home/innovation/webdevp.svg", sort_order: 0, accent: "purple" },
  { title: "App Development", slug: "app-development", description: "Native and cross-platform mobile apps that users love.", icon: "/images/home/innovation/uiux.svg", sort_order: 1, accent: "blue" },
  { title: "Backend & API Development", slug: "backend-api-development", description: "Robust backends and APIs that power your product.", icon: "/images/home/innovation/analitics.svg", sort_order: 2, accent: "orange" },
  { title: "AI / Automation Solutions", slug: "ai-automation-solutions", description: "Intelligent automation and AI-driven features.", icon: "/images/home/innovation/digitalmarketing.svg", sort_order: 3, accent: "green" },
  { title: "SaaS Product Development", slug: "saas-product-development", description: "End-to-end SaaS products built to scale.", icon: "/images/home/innovation/brand.svg", sort_order: 4, accent: "pink" },
  { title: "Custom Software Development", slug: "custom-software-development", description: "Tailored software solutions for your unique needs.", icon: "/images/home/innovation/webdevp.svg", sort_order: 5, accent: "violet" },
] as const;

type Service = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  published?: boolean;
  seo_title?: string;
  seo_description?: string;
  hero_image_url?: string;
  content_json?: { accent?: string };
};

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  icon: "",
  sort_order: 0,
  accent: "purple",
  published: true,
  seo_title: "",
  seo_description: "",
  hero_image_url: "",
  content_json: "{}",
};

export default function ServicesPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [seeding, setSeeding] = useState(false);

  const { data, error } = useQuery({
    queryKey: ["admin", "content", "services"],
    queryFn: () => api.content.services.list(),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        icon: form.icon || null,
        sort_order: form.sort_order,
        published: form.published,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        hero_image_url: form.hero_image_url,
        content_json: { accent: form.accent },
      };
      return editing?.id ? api.content.services.update(editing.id, body) : api.content.services.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content", "services"] });
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.services.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "content", "services"] }),
  });

  const items: Service[] = Array.isArray(data) ? data : [];

  function startEdit(s: Service) {
    setEditing(s);
    setForm({
      title: s.title,
      slug: s.slug ?? "",
      description: s.description ?? "",
      icon: s.icon ?? "",
      sort_order: s.sort_order ?? 0,
      accent: s.content_json?.accent ?? "purple",
      published: s.published !== false,
      seo_title: s.seo_title ?? "",
      seo_description: s.seo_description ?? "",
      hero_image_url: s.hero_image_url ?? "",
      content_json: s.content_json ? JSON.stringify(s.content_json, null, 2) : "{}",
    });
  }

  function startFromTemplate(template: (typeof DEFAULT_SERVICES)[number]) {
    setEditing({ id: "", title: template.title });
    setForm({
      ...emptyForm,
      title: template.title,
      slug: template.slug,
      description: template.description,
      icon: template.icon,
      sort_order: template.sort_order,
      accent: template.accent,
    });
  }

  async function seedDefaults() {
    setSeeding(true);
    try {
      for (const s of DEFAULT_SERVICES) {
        const existing = items.find((i) => i.slug === s.slug);
        const body = {
          title: s.title,
          slug: s.slug,
          description: s.description,
          icon: s.icon,
          sort_order: s.sort_order,
          published: true,
          content_json: { accent: s.accent },
        };
        if (existing?.id) {
          await api.content.services.update(existing.id, body);
        } else {
          await api.content.services.create(body);
        }
      }
      qc.invalidateQueries({ queryKey: ["admin", "content", "services"] });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Services"
        description="Manage website service cards — synced to curvvtech.com/services."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={seedDefaults} disabled={seeding}>
              {seeding ? "Syncing…" : "Sync defaults"}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => { setEditing({ id: "", title: "" }); setForm(emptyForm); }}>
              <Plus className="h-4 w-4" /> Add service
            </Button>
          </div>
        }
      />
      <BackendErrorAlert error={error} />

      {items.length === 0 && !editing && (
        <div className="space-y-4">
          <EmptyState
            title="No services"
            description="Sync the 6 default services or add your own."
            cta={<Button onClick={seedDefaults} disabled={seeding}>Sync defaults</Button>}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-3xl">
            {DEFAULT_SERVICES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => startFromTemplate(s)}
                className="text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.slug}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-3 mb-6">
          {items
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-4 flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {s.icon && (
                    <img src={s.icon} alt="" className="w-8 h-8 opacity-80" />
                  )}
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.slug ?? "—"} · order {s.sort_order ?? 0}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={s.published ? "default" : "secondary"}>{s.published ? "Published" : "Draft"}</Badge>
                      {s.content_json?.accent && (
                        <Badge variant="outline">{s.content_json.accent}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(s)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
        </ul>
      )}

      {editing && (
        <div className="rounded-lg border border-border p-4 space-y-3 max-w-xl">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="web-development" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div><Label>Icon URL</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="/images/home/innovation/webdevp.svg" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Card accent</Label>
              <Select value={form.accent} onValueChange={(v) => setForm({ ...form, accent: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>SEO title</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></div>
          <div><Label>SEO description</Label><Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} rows={2} /></div>
          <div><Label>Hero image URL</Label><Input value={form.hero_image_url} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
