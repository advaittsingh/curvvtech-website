import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const isLikelyBackendUnreachable = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /fetch|network|failed to load|cors/i.test(msg) ||
    msg === "Failed to fetch" ||
    msg.includes("Load failed")
  );
};

export function BackendErrorAlert({ error }: { error: unknown }) {
  if (!error || !isLikelyBackendUnreachable(error)) return null;

  return (
    <Alert variant="destructive" className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Cannot reach the API</AlertTitle>
      <AlertDescription className="mt-1 space-y-2 text-sm">
        <p>Data failed to load because the admin panel could not reach your backend.</p>
        <ul className="list-inside list-disc space-y-0.5 pt-1">
          <li>
            <strong>Admin panel (Vercel):</strong> Set <code className="rounded bg-amber-100 px-1">VITE_BACKEND_URL</code> to your
            backend URL (e.g. <code className="rounded bg-amber-100 px-1">https://your-backend.vercel.app</code>). No trailing slash. Redeploy after changing.
          </li>
          <li>
            <strong>Backend (API host):</strong> Set <code className="rounded bg-amber-100 px-1">ADMIN_PANEL_URL</code> to your admin origin so CORS allows requests. The API uses <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> on the server only (never in this SPA).
          </li>
        </ul>
        <p className="pt-1 text-xs text-amber-800">
          Vercel: Project → Settings → Environment Variables. See <strong>ENV_VERCEL.md</strong> or <strong>ADMIN_SETUP_CHECKLIST.md</strong> in the repo.
        </p>
      </AlertDescription>
    </Alert>
  );
}
