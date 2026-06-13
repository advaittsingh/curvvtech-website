import { PageHeader } from "@/components/system";
import { useAuth } from "@/app/providers";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user, role } = useAuth();

  return (
    <div className="p-6 max-w-xl space-y-6">
      <PageHeader title="Settings" description="Organization and account preferences." />
      <div className="space-y-4 rounded-lg border border-stone-200 p-4">
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={role ?? "—"} disabled />
        </div>
        <Button disabled>Save changes</Button>
      </div>
    </div>
  );
}
