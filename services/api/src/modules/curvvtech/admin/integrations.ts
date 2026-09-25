import { Router } from "express";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import {
  buildGoogleOauthUrl,
  GOOGLE_PROVIDERS,
  type GoogleProvider,
} from "../integrations/googleCalendar.js";

const PROVIDERS = ["gmail", "google_calendar", "whatsapp"] as const;

const router = Router();

router.get("/", async (req, res) => {
  try {
    const auth = req.auth!;
    const rows = (await sql`
      SELECT id, provider, user_id, enabled, metadata, token_expires_at, "updatedAt", "createdAt"
      FROM integration_connections
      WHERE user_id = ${auth.sub}
      ORDER BY provider
    `) as { provider: string; enabled: boolean; metadata: unknown; updatedAt: string | null }[];
    const status = PROVIDERS.map((p) => {
      const conn = rows.find((r) => r.provider === p);
      return {
        provider: p,
        connected: Boolean(conn?.enabled),
        metadata: conn?.metadata ?? {},
        updatedAt: conn?.updatedAt ?? null,
      };
    });
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/connect", async (req, res) => {
  try {
    const auth = req.auth!;
    const { provider, access_token, refresh_token, metadata } = req.body;
    if (!PROVIDERS.includes(provider)) {
      res.status(400).json({ error: "Invalid provider" });
      return;
    }
    if (!access_token) {
      res.status(400).json({ error: "OAuth access_token required. Use Connect to authorize via Google." });
      return;
    }
    const row = firstRow(
      await sql`
      INSERT INTO integration_connections (provider, user_id, access_token, refresh_token, metadata, enabled)
      VALUES (${provider}, ${auth.sub}, ${access_token ?? null}, ${refresh_token ?? null}, ${JSON.stringify(metadata ?? {})}::jsonb, true)
      ON CONFLICT (provider, user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, integration_connections.refresh_token),
        metadata = EXCLUDED.metadata,
        enabled = true,
        "updatedAt" = NOW()
      RETURNING id, provider, enabled, metadata, "updatedAt"
    `,
    );
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/disconnect", async (req, res) => {
  try {
    const auth = req.auth!;
    const { provider } = req.body;
    await sql`
      UPDATE integration_connections SET enabled = false, access_token = NULL, "updatedAt" = NOW()
      WHERE provider = ${provider} AND user_id = ${auth.sub}
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/oauth-url/:provider", async (req, res) => {
  const { provider } = req.params;
  if (provider === "whatsapp") {
    res.json({
      provider,
      configured: false,
      message: "WhatsApp uses WHATSAPP_GRAPH_ACCESS_TOKEN on the API, not Google OAuth.",
    });
    return;
  }
  if (!GOOGLE_PROVIDERS.includes(provider as GoogleProvider)) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  const built = buildGoogleOauthUrl({
    sub: req.auth!.sub,
    provider: provider as GoogleProvider,
  });
  if ("error" in built) {
    res.json({ provider, configured: false, message: built.error });
    return;
  }
  res.json({ provider, configured: true, url: built.url });
});

export default router;
