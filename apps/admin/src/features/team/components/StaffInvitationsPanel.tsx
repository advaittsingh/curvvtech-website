import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Loader2, MailPlus, Trash2 } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StaffInvitation } from "../team-schemas";

const INVITABLE_ROLES = [
  ["designer", "Designer"],
  ["developer", "Developer"],
  ["project_manager", "Project manager"],
  ["sales", "Sales"],
  ["accountant", "Accountant"],
  ["admin", "Admin"],
] as const;

export function StaffInvitationsPanel() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("designer");
  const [inviteUrl, setInviteUrl] = useState("");

  const query = useQuery({
    queryKey: ["admin", "team", "invitations"],
    queryFn: () => api.team.invitations(),
  });

  const invitations = (
    Array.isArray(query.data) ? query.data : query.data?.invitations ?? []
  ).filter((invitation: StaffInvitation) => !invitation.status || invitation.status === "pending");

  const create = useMutation({
    mutationFn: () => api.team.invite({ email: email.trim(), name: name.trim() || undefined, role }),
    onSuccess: (result) => {
      setInviteUrl(result.invite_url);
      setEmail("");
      setName("");
      setRole("designer");
      qc.invalidateQueries({ queryKey: ["admin", "team", "invitations"] });
      toast({ title: "Invitation created", description: "Copy the secure link and send it to the team member." });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.team.revokeInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "team", "invitations"] });
      toast({ title: "Invitation revoked" });
    },
  });

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Invite link copied" });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" });
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="staff-invites-title">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><MailPlus className="h-4 w-4" /></div>
        <div>
          <h2 id="staff-invites-title" className="font-semibold">Restricted workspace access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create single-use invitations. Admin access remains separate from super admin access.
          </p>
        </div>
      </div>

      <form
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim()) create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="staff-email">Email</Label>
          <Input id="staff-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-name">Name (optional)</Label>
          <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INVITABLE_ROLES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="self-end" type="submit" disabled={!email.trim() || create.isPending}>
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create invite
        </Button>
      </form>

      {create.error && <p role="alert" className="mt-3 text-sm text-destructive">{(create.error as Error).message}</p>}

      {inviteUrl && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Link2 className="h-4 w-4" /> Invite link ready
          </div>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={inviteUrl} aria-label="Created invitation link" className="bg-white font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyLink(inviteUrl)} aria-label="Copy invite link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-medium">Pending invitations</h3>
        {query.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading invitations…</p>
        ) : query.error ? (
          <p className="mt-3 text-sm text-destructive">{(query.error as Error).message}</p>
        ) : invitations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {invitations.map((invitation: StaffInvitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invitation.name || invitation.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{invitation.email}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{invitation.role.replace(/_/g, " ")}</Badge>
                {invitation.invite_url && (
                  <Button variant="ghost" size="icon" onClick={() => copyLink(invitation.invite_url!)} aria-label={`Copy invite for ${invitation.email}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => revoke.mutate(invitation.id)}
                  disabled={revoke.isPending}
                  aria-label={`Revoke invite for ${invitation.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
