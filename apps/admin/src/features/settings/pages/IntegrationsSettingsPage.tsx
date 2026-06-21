import { IntegrationsPanel } from "../components/IntegrationsPanel";
import { PageHeader } from "@/components/system";

export default function IntegrationsSettingsPage() {
  return (
    <div className="p-6 max-w-xl">
      <PageHeader title="Integrations" description="Gmail, Google Calendar, and WhatsApp Business." />
      <div className="mt-4"><IntegrationsPanel /></div>
    </div>
  );
}
