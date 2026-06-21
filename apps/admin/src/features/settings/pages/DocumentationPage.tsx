import { PageHeader } from "@/components/system";

export default function DocumentationPage() {
  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Documentation" description="CurvvTech OS admin guide" />
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>CurvvTech OS connects sales, delivery, finance, and operations in one admin panel backed by the unified API.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Command Center</strong> — revenue, pipeline, and delivery health on the dashboard.</li>
          <li><strong>CRM</strong> — leads, clients, proposals with AI-assisted writing.</li>
          <li><strong>Delivery</strong> — projects, tasks, files, and SOP automations.</li>
          <li><strong>Finance</strong> — invoices, expenses, payroll, and payments.</li>
          <li><strong>Settings</strong> — company profile, integrations (OAuth), and team roles.</li>
        </ul>
        <p>API base: configure <code>VITE_API_URL</code> in Vercel. Admin roles are enforced server-side via <code>requireCurvvtechAdmin</code>.</p>
      </div>
    </div>
  );
}
