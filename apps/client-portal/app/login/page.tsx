"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchBranding, login, type Branding } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<Branding["branding"]>({ company_name: "Client Portal" });

  useEffect(() => {
    fetchBranding().then((b) => setBranding(b.branding)).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const brand = branding.brand_color ?? "#111111";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: brand }}>
        <div className="text-xl font-semibold">{branding.company_name ?? "Client Portal"}</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Everything about your project, in one place.</h1>
          <p className="mt-4 text-white/70 max-w-md">
            Track progress, review deliverables, pay invoices, and chat with your team — all from your portal.
          </p>
        </div>
        <div className="text-white/40 text-sm">Powered by Curvvtech OS</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt="logo" className="h-10 mb-6" />
          ) : (
            <div className="text-2xl font-bold mb-6">{branding.company_name ?? "Client Portal"}</div>
          )}
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-[var(--muted)] mt-1 mb-6 text-sm">Sign in to your project portal</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 mb-4 outline-none focus:border-[var(--brand-accent)]"
            placeholder="you@company.com"
          />

          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 mb-6 outline-none focus:border-[var(--brand-accent)]"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-white font-medium disabled:opacity-60"
            style={{ background: brand }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
