"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/api";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await acceptInvite(token, password, name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <h2 className="text-2xl font-semibold">Set up your account</h2>
        <p className="text-[var(--muted)] mt-1 mb-6 text-sm">Create a password to access your portal.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 mb-4 outline-none focus:border-[var(--brand-accent)]"
          placeholder="Full name"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 mb-6 outline-none focus:border-[var(--brand-accent)]"
          placeholder="At least 8 characters"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 text-white font-medium bg-[var(--brand)] disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
