import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const PROVIDERS = ['gmail', 'google_calendar', 'whatsapp'] as const

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (req, res) => {
  try {
    const auth = req.auth!
    const rows = await sql`
      SELECT id, provider, user_id, enabled, metadata, token_expires_at, "updatedAt", "createdAt"
      FROM integration_connections
      WHERE user_id = ${auth.sub}
      ORDER BY provider
    ` as { provider: string; enabled: boolean; metadata: unknown; updatedAt: string | null }[]
    const status = PROVIDERS.map((p) => {
      const conn = rows.find((r) => r.provider === p)
      return {
        provider: p,
        connected: Boolean(conn?.enabled),
        metadata: conn?.metadata ?? {},
        updatedAt: conn?.updatedAt ?? null,
      }
    })
    res.json(status)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/connect', async (req, res) => {
  try {
    const auth = req.auth!
    const { provider, access_token, refresh_token, metadata } = req.body
    if (!PROVIDERS.includes(provider)) {
      res.status(400).json({ error: 'Invalid provider' })
      return
    }
    if (!access_token) {
      res.status(400).json({ error: 'OAuth access_token required. Use Connect to authorize via Google.' })
      return
    }
    const row = firstRow(await sql`
      INSERT INTO integration_connections (provider, user_id, access_token, refresh_token, metadata, enabled)
      VALUES (${provider}, ${auth.sub}, ${access_token ?? null}, ${refresh_token ?? null}, ${JSON.stringify(metadata ?? {})}::jsonb, true)
      ON CONFLICT (provider, user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, integration_connections.refresh_token),
        metadata = EXCLUDED.metadata,
        enabled = true,
        "updatedAt" = NOW()
      RETURNING id, provider, enabled, metadata, "updatedAt"
    `)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/disconnect', async (req, res) => {
  try {
    const auth = req.auth!
    const { provider } = req.body
    await sql`
      UPDATE integration_connections SET enabled = false, access_token = NULL, "updatedAt" = NOW()
      WHERE provider = ${provider} AND user_id = ${auth.sub}
    `
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/oauth-url/:provider', async (req, res) => {
  const { provider } = req.params
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${process.env.ADMIN_PANEL_URL ?? 'https://admin.curvvtech.com'}/settings/integrations`
  if (!clientId && (provider === 'gmail' || provider === 'google_calendar')) {
    res.json({
      provider,
      configured: false,
      message: 'Set GOOGLE_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI to enable OAuth',
    })
    return
  }
  const scopes =
    provider === 'gmail'
      ? 'https://www.googleapis.com/auth/gmail.send'
      : provider === 'google_calendar'
        ? 'https://www.googleapis.com/auth/calendar.events'
        : ''
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${provider}`
  res.json({ provider, configured: true, url })
})

export default router
