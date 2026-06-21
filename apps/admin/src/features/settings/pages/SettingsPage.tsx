import { PageHeader } from "@/components/system";
import { useAuth } from "@/app/providers";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationsPanel } from "../components/IntegrationsPanel";

export default function SettingsPage() {
  const { user, role } = useAuth();

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Company profile, integrations, notifications, and security." />

      <Tabs defaultValue="company">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <Label>Company name</Label>
            <Input defaultValue="CurvvTech" />
          </div>
          <div>
            <Label>GST / Tax ID</Label>
            <Input placeholder="Optional" />
          </div>
          <div>
            <Label>Address</Label>
            <Input placeholder="Business address" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input placeholder="+91 …" />
          </div>
          <Button disabled>Save company settings</Button>
        </TabsContent>

        <TabsContent value="account" className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={role ?? "—"} disabled />
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="rounded-xl border border-border bg-card p-5">
          <IntegrationsPanel />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Email and push notifications for invoices, leads, and project updates — coming soon.
          </p>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Two-factor authentication, password policy, and sessions.</p>
          <Button variant="outline" disabled>
            Enable 2FA
          </Button>
          <Button variant="outline" disabled>
            Manage active sessions
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
