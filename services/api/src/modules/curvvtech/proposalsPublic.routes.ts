import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { sql, firstRow } from '../../lib/sqlPool.js'

const router = Router()

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(shareLimiter)

async function loadByToken(token: string) {
  return firstRow<{ id: string; status: string; title: string; client_name: string | null }>(
    await sql`SELECT id, status, title, client_name FROM proposals WHERE share_token = ${token}`
  )
}

router.get('/share/:token', async (req, res) => {
  try {
    const proposal = await loadByToken(req.params.token)
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' })
      return
    }
    if (proposal.status === 'draft') {
      res.status(403).json({ error: 'Proposal not yet shared' })
      return
    }
    await sql`
      UPDATE proposals SET viewed_at = COALESCE(viewed_at, NOW()),
        view_count = view_count + 1,
        status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
      WHERE id = ${proposal.id}::uuid
    `
    await sql`
      INSERT INTO proposal_events (proposal_id, event_type)
      VALUES (${proposal.id}::uuid, 'viewed')
    `
    const sections = await sql`
      SELECT title, content, section_key, block_type FROM proposal_sections
      WHERE proposal_id = ${proposal.id}::uuid ORDER BY sort_order ASC
    `
    const meta = firstRow<{ metadata_json: unknown; total_cents: number }>(
      await sql`SELECT metadata_json, total_cents FROM proposals WHERE id = ${proposal.id}::uuid`,
    )
    res.json({ ...proposal, sections, metadata_json: meta?.metadata_json ?? {}, total_cents: meta?.total_cents ?? 0 })
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/share/:token/approve', async (req, res) => {
  try {
    const proposal = await loadByToken(req.params.token)
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' })
      return
    }
    if (proposal.status === 'draft') {
      res.status(403).json({ error: 'Proposal not yet shared' })
      return
    }
    if (proposal.status === 'approved') {
      res.json({ ok: true, status: 'approved' })
      return
    }
    if (proposal.status === 'rejected') {
      res.status(409).json({ error: 'Proposal already declined' })
      return
    }

    const { selected_addon_ids, signature } = req.body ?? {}
    const { finalizeApprovedProposal } = await import('./services/proposalFinalize.js')
    const result = await finalizeApprovedProposal(proposal.id, {
      selectedAddonIds: Array.isArray(selected_addon_ids) ? selected_addon_ids : [],
      signature: signature && typeof signature === 'object' ? signature : undefined,
    })

    if (!result) {
      res.status(500).json({ error: 'Failed to finalize proposal' })
      return
    }

    res.json({ ok: true, status: 'approved', ...result })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/share/:token/changes', async (req, res) => {
  try {
    const proposal = await loadByToken(req.params.token)
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' })
      return
    }
    await sql`
      UPDATE proposals SET status = 'negotiation', "updatedAt" = NOW() WHERE id = ${proposal.id}::uuid
    `
    await sql`
      INSERT INTO proposal_events (proposal_id, event_type, metadata)
      VALUES (${proposal.id}::uuid, 'changes_requested', ${JSON.stringify(req.body ?? {})}::jsonb)
    `
    res.json({ ok: true, status: 'negotiation' })
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/share/:token/reject', async (req, res) => {
  try {
    const proposal = await loadByToken(req.params.token)
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' })
      return
    }
    if (proposal.status === 'draft') {
      res.status(403).json({ error: 'Proposal not yet shared' })
      return
    }
    if (proposal.status === 'rejected') {
      res.json({ ok: true, status: 'rejected' })
      return
    }
    if (proposal.status === 'approved') {
      res.status(409).json({ error: 'Proposal already approved' })
      return
    }
    await sql`
      UPDATE proposals SET status = 'rejected', rejected_at = NOW(), "updatedAt" = NOW()
      WHERE id = ${proposal.id}::uuid
    `
    await sql`
      INSERT INTO proposal_events (proposal_id, event_type, metadata)
      VALUES (${proposal.id}::uuid, 'rejected', ${JSON.stringify(req.body ?? {})}::jsonb)
    `
    res.json({ ok: true, status: 'rejected' })
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
