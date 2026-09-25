import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acceptStaffInvite, validateStaffInvite } from "@/features/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StaffInvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);

  const invite = useQuery({
    queryKey: ["staff-invite", token],
    queryFn: () => validateStaffInvite(token),
    enabled: Boolean(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => acceptStaffInvite(token, { name: name.trim(), password }),
    onSuccess: ({ hasSession }) => {
      setAccepted(true);
      window.setTimeout(() => navigate(hasSession ? "/my-work" : "/auth/sign-in", { replace: true }), 700);
    },
  });

  const details = invite.data;
  const displayRole = details?.role?.replace(/_/g, " ") ?? "team member";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>

        {invite.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-stone-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Validating invitation…
          </div>
        ) : invite.error ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-stone-900">Invitation unavailable</h1>
            <p className="text-sm text-stone-600">{(invite.error as Error).message}</p>
            <Button asChild variant="outline"><Link to="/auth/sign-in">Go to sign in</Link></Button>
          </div>
        ) : accepted ? (
          <div className="space-y-3 py-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            <h1 className="text-xl font-semibold text-stone-900">Workspace access activated</h1>
            <p className="text-sm text-stone-600">Taking you to your workspace…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Join the Curvvtech workspace</h1>
            <p className="mt-2 text-sm text-stone-600">
              You’ve been invited as <span className="font-medium capitalize text-stone-900">{displayRole}</span>
              {details?.email ? ` using ${details.email}` : ""}.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim() && password.length >= 8) accept.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={details?.name ?? "Your name"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-password">Create password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-xs text-stone-500">Use at least 8 characters.</p>
              </div>
              {accept.error && (
                <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {(accept.error as Error).message}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={!name.trim() || password.length < 8 || accept.isPending}>
                {accept.isPending ? "Activating access…" : "Accept invitation"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
