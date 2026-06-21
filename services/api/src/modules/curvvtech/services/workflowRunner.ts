import { sql, firstRow } from '../../../lib/sqlPool.js'

type TriggerContext = {
  trigger_type: string
  entity_type: string
  entity_id: string
  payload: Record<string, unknown>
}

export async function runCurvvtechWorkflows(ctx: TriggerContext): Promise<void> {
  const workflows = await sql`
    SELECT id::text AS id, trigger_type, trigger_config
    FROM curvvtech_workflows
    WHERE enabled = true AND trigger_type = ${ctx.trigger_type}
  `

  for (const wf of workflows as { id: string; trigger_type: string; trigger_config: unknown }[]) {
    const cfg = (wf.trigger_config ?? {}) as Record<string, unknown>
    if (ctx.trigger_type === 'lead_status_change') {
      const toStatus = cfg.to_status as string | undefined
      if (toStatus && ctx.payload.status !== toStatus) continue
    }
    if (ctx.trigger_type === 'invoice_paid' && ctx.entity_type !== 'invoice') continue
    if (ctx.trigger_type === 'proposal_accepted' && ctx.payload.status !== 'approved') continue

    const actions = await sql`
      SELECT action_type, action_config, step_order
      FROM curvvtech_workflow_actions
      WHERE workflow_id = ${wf.id}::uuid
      ORDER BY step_order ASC
    `

    const results: unknown[] = []
    for (const action of actions as { action_type: string; action_config: unknown; step_order: number }[]) {
      const ac = (action.action_config ?? {}) as Record<string, unknown>
      try {
        if (action.action_type === 'create_task') {
          const title = String(ac.title ?? 'Follow-up task')
          const dueInDays = Number(ac.due_in_days ?? 0)
          const dueAt = dueInDays > 0 ? new Date(Date.now() + dueInDays * 86400000).toISOString() : null
          const row = firstRow<{ id: string }>(await sql`
            INSERT INTO tasks (title, lead_id, assignee_user_id, due_at, status, priority)
            VALUES (
              ${title},
              ${ctx.entity_type === 'lead' ? ctx.entity_id : null},
              ${ac.assignee_user_id ?? null},
              ${dueAt},
              'todo',
              ${String(ac.priority ?? 'medium')}
            )
            RETURNING id
          `)
          results.push({ action: 'create_task', task_id: row?.id })
        } else if (action.action_type === 'update_lead' && ctx.entity_type === 'lead') {
          if (ac.status) {
            await sql`UPDATE crm_leads SET status = ${String(ac.status)}, "updatedAt" = NOW() WHERE id = ${ctx.entity_id}::uuid`
          }
          results.push({ action: 'update_lead' })
        } else if (action.action_type === 'create_project' && ctx.entity_type === 'lead') {
          const lead = firstRow<{ name: string | null; company: string | null }>(
            await sql`SELECT name, company FROM crm_leads WHERE id = ${ctx.entity_id}::uuid`
          )
          if (lead) {
            let clientId: string | null = null
            const c = firstRow<{ id: string }>(await sql`
              INSERT INTO clients (name, company, status)
              VALUES (${lead.name ?? lead.company ?? 'New client'}, ${lead.company ?? null}, 'active')
              RETURNING id::text AS id
            `)
            clientId = c?.id ?? null
            if (clientId) {
              const p = firstRow<{ id: string }>(await sql`
                INSERT INTO projects (client_id, name, status)
                VALUES (${clientId}::uuid, ${String(ac.project_name ?? lead.company ?? 'New project')}, 'active')
                RETURNING id
              `)
              results.push({ action: 'create_project', project_id: p?.id })
            }
          }
        } else if (action.action_type === 'create_invoice' && ctx.entity_type === 'lead') {
          const lead = firstRow<{ client_id?: string }>(
            await sql`SELECT id FROM crm_leads WHERE id = ${ctx.entity_id}::uuid`,
          )
          if (lead) {
            const inv = firstRow<{ id: string }>(await sql`
              INSERT INTO invoices (client_id, invoice_number, status)
              VALUES (NULL, ${'INV-' + Date.now().toString().slice(-6)}, 'draft')
              RETURNING id
            `)
            results.push({ action: 'create_invoice', invoice_id: inv?.id })
          }
        } else if (action.action_type === 'send_email') {
          results.push({ action: 'send_email', status: 'queued', note: 'Configure SMTP in company settings' })
        } else if (action.action_type === 'log_activity') {
          await sql`
            INSERT INTO activity_logs (action, entity_type, entity_id, details)
            VALUES (${String(ac.message ?? 'Workflow ran')}, ${ctx.entity_type}, ${ctx.entity_id}, ${JSON.stringify(ctx.payload)}::jsonb)
          `
          results.push({ action: 'log_activity' })
        }
      } catch (err) {
        results.push({ action: action.action_type, error: (err as Error).message })
      }
    }

    await sql`
      INSERT INTO curvvtech_workflow_runs (workflow_id, entity_type, entity_id, status, result)
      VALUES (${wf.id}::uuid, ${ctx.entity_type}, ${ctx.entity_id}, 'completed', ${JSON.stringify(results)}::jsonb)
    `
  }
}
