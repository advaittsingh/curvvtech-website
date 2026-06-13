import { useAuth } from "@/app/providers";
import { PageHeader, StatCard } from "@/components/system";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, role, logout } = useAuth();

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <PageHeader title="Profile" description="Your account in CurvvTech OS." />
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Role" value={role ?? "—"} />
        <StatCard title="Access" value={user?.accessAllowed ? "Active" : "Waitlist"} />
      </div>
      <div className="rounded-lg border border-stone-200 p-4 text-sm space-y-2">
        <p><span className="text-stone-500">Email:</span> {user?.email ?? "—"}</p>
        <p><span className="text-stone-500">User ID:</span> <span className="font-mono text-xs">{user?.id}</span></p>
      </div>
      <Button variant="outline" onClick={() => void logout()}>Sign out</Button>
    </div>
  );
}
