import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { initMonitoring } from "@/lib/monitoring";
import App from "./App";
import "./index.css";

initMonitoring();

// Invitations sent before hash routing was reflected in the email URL use
// /auth/staff-invite/:token. Normalize those links before HashRouter starts.
if (window.location.pathname.startsWith("/auth/staff-invite/")) {
  window.history.replaceState(
    null,
    "",
    `/#${window.location.pathname}${window.location.search}`,
  );
}

// Vite emits this when a lazy-loaded chunk 404s after a deploy.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  const key = "admin_chunk_reload";
  const lastReload = Number(sessionStorage.getItem(key) ?? 0);
  if (!Number.isFinite(lastReload) || Date.now() - lastReload > 30_000) {
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
