import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { PageHeader } from "@/components/system";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type CompanyForm = {
  company_name: string;
  tax_id: string;
  gst_number: string;
  address: string;
  phone: string;
  cash: string;
  logo_url: string;
  brand_color: string;
  email_from: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
};

export default function CompanySettingsPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, error } = useQuery({ queryKey: ["admin", "company"], queryFn: () => api.company.get() });
  const [form, setForm] = useState<CompanyForm | null>(null);

  const company = (data ?? {}) as Record<string, unknown>;
  const values: CompanyForm = form ?? {
    company_name: String(company.company_name ?? "CurvvTech"),
    tax_id: String(company.tax_id ?? ""),
    gst_number: String(company.gst_number ?? company.tax_id ?? ""),
    address: String(company.address ?? ""),
    phone: String(company.phone ?? ""),
    cash: String(Number(company.cash_in_bank_cents ?? 0) / 100),
    logo_url: String(company.logo_url ?? ""),
    brand_color: String(company.brand_color ?? "#000000"),
    email_from: String(company.email_from ?? ""),
    smtp_host: String(company.smtp_host ?? ""),
    smtp_port: String(company.smtp_port ?? "587"),
    smtp_user: String(company.smtp_user ?? ""),
    smtp_pass: "",
  };

  const set = (patch: Partial<CompanyForm>) => setForm({ ...values, ...patch });

  const save = useMutation({
    mutationFn: () =>
      api.company.update({
        company_name: values.company_name,
        tax_id: values.tax_id || null,
        gst_number: values.gst_number || null,
        address: values.address || null,
        phone: values.phone || null,
        cash_in_bank_cents: Math.round(Number(values.cash || 0) * 100),
        logo_url: values.logo_url || null,
        brand_color: values.brand_color || null,
        email_from: values.email_from || null,
        smtp_host: values.smtp_host || null,
        smtp_port: values.smtp_port ? Number(values.smtp_port) : null,
        smtp_user: values.smtp_user || null,
        ...(values.smtp_pass ? { smtp_pass: values.smtp_pass } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "company"] });
      setForm(null);
      toast({ title: "Company settings saved" });
    },
  });

  return (
    <div className="p-6 max-w-xl space-y-4">
      <PageHeader title="Company" description="Profile used across CurvvTech OS and CEO metrics." />
      <BackendErrorAlert error={error} />
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-medium text-sm">Brand</h3>
        <div><Label>Company name</Label><Input value={values.company_name} onChange={(e) => set({ company_name: e.target.value })} /></div>
        <div><Label>Logo URL</Label><Input value={values.logo_url} onChange={(e) => set({ logo_url: e.target.value })} placeholder="https://…" /></div>
        <div className="flex gap-3 items-end">
          <div className="flex-1"><Label>Brand color</Label><Input value={values.brand_color} onChange={(e) => set({ brand_color: e.target.value })} /></div>
          <div className="h-10 w-10 rounded border border-border shrink-0" style={{ backgroundColor: values.brand_color }} />
        </div>
        <div><Label>GST / Tax ID</Label><Input value={values.gst_number} onChange={(e) => set({ gst_number: e.target.value, tax_id: e.target.value })} /></div>
        <div><Label>Address</Label><Input value={values.address} onChange={(e) => set({ address: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={values.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
        <div><Label>Cash in bank (₹) — CEO dashboard</Label><Input type="number" value={values.cash} onChange={(e) => set({ cash: e.target.value })} /></div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-medium text-sm">SMTP (outbound email)</h3>
        <div><Label>From address</Label><Input value={values.email_from} onChange={(e) => set({ email_from: e.target.value })} placeholder="hello@curvvtech.in" /></div>
        <div><Label>SMTP host</Label><Input value={values.smtp_host} onChange={(e) => set({ smtp_host: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Port</Label><Input value={values.smtp_port} onChange={(e) => set({ smtp_port: e.target.value })} /></div>
          <div><Label>Username</Label><Input value={values.smtp_user} onChange={(e) => set({ smtp_user: e.target.value })} /></div>
        </div>
        <div><Label>Password</Label><Input type="password" value={values.smtp_pass} onChange={(e) => set({ smtp_pass: e.target.value })} placeholder="Leave blank to keep existing" /></div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Save company settings</Button>
    </div>
  );
}
