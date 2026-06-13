/**
 * Monitoring hooks — wire Sentry / PostHog / Logtail via env when keys are present.
 */
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

export function initMonitoring(): void {
  if (sentryDsn) {
    console.info("[monitoring] Sentry DSN configured — add @sentry/react to enable.");
  }
  if (posthogKey) {
    console.info("[monitoring] PostHog key configured — add posthog-js to enable.");
  }
  if (import.meta.env.DEV) {
    console.info("[monitoring] Dev mode — analytics disabled.");
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (import.meta.env.DEV) return;
  void name;
  void props;
}
