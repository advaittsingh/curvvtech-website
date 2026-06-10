import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/backend-url";
import { isSessionPresent, setSessionTokens } from "@/lib/session";

export default function SignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isSessionPresent()) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sign in failed");
        return;
      }
      if (data.access_token && data.refresh_token) {
        setSessionTokens(data.access_token, data.refresh_token);
        navigate(from.startsWith("/") ? from : "/", { replace: true });
        return;
      }
      setError("Invalid response from server");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-50 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-900">CurvvTech Admin</h1>
          <p className="text-stone-600 text-sm mt-1">Sign in with your account (JWT).</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md h-11 bg-stone-800 text-white font-medium hover:bg-stone-700 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-stone-600">
          <Link to="/auth/sign-up" className="text-stone-800 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
