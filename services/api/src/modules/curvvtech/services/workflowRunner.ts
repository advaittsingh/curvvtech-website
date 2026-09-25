import { sql, firstRow } from '../../../lib/sqlPool.js'
import { sendEmail } from '../../shared/communications/mailer.js'
import { logger } from '../../../logger.js'

type TriggerContext = {
  trigger_type: string
  entity_type: string
  entity_id: string
  payload: Record<string, unknown>
}

type WorkflowCondition = {
  field: string
  operator: string
  value: unknown
}

/** Evaluate an optional list of AND-conditions against the trigger payload. */
function evaluateConditions(conditions: unknown, payload: Record<string, unknown>): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true
  return conditions.every((raw) => {
    const c = raw as WorkflowCondition
    if (!c || !c.field) return true
    const actual = payload[c.field]
    const expected = c.value
    const numA = Number(actual)
    const numB = Number(expected)
    const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB) && String(expected).trim() !== ''
    switch (c.operator) {
      case 'eq':
        return String(actual ?? '') === String(expected ?? '')
      case 'neq':
        return String(actual ?? '') !== String(expected ?? '')
      case 'gt':
        return bothNumeric && numA > numB
      case 'gte':
        return bothNumeric && numA >= numB
      case 'lt':
        return bothNumeric && numA < numB
      case 'lte':
        return bothNumeric && numA <= numB
      case 'contains':
        return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase())
      default:
        return true
    }
  })
}

type WorkflowRecipient = { email: string | null; name: string | null }

/** Resolve the target recipient (email + name) for a workflow send_email action. */
async function resolveWorkflowRecipient(
  ctx: TriggerContext,
  ac: Record<string, unknown>,
): Promise<WorkflowRecipient | null> {
  if (ac.to) return { email: String(ac.to), name: null }
  try {
    if (ctx.entity_type === 'lead') {
      return firstRow<WorkflowRecipient>(
        await sql`SELECT email, name FROM crm_leads WHERE id = ${ctx.entity_id}::uuid LIMIT 1`,
      )
    }
    if (ctx.entity_type === 'invoice') {
      return firstRow<WorkflowRecipient>(await sql`
        SELECT c.email, c.name FROM invoices i
        JOIN clients c ON c.id = i.client_id
        WHERE i.id = ${ctx.entity_id}::uuid LIMIT 1
      `)
    }
    if (ctx.entity_type === 'client') {
      return firstRow<WorkflowRecipient>(
        await sql`SELECT email, name FROM clients WHERE id = ${ctx.entity_id}::uuid LIMIT 1`,
      )
    }
  } catch {
    return null
  }
  return null
}

/** Replace {{name}}, {{email}}, and {{payload.*}} tokens in workflow email copy. */
function interpolate(template: string, recipient: WorkflowRecipient | null, ctx: TriggerContext): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    if (key === 'name') return recipient?.name ?? 'there'
    if (key === 'email') return recipient?.email ?? ''
    if (key.startsWith('payload.')) {
      const v = ctx.payload[key.slice('payload.'.length)]
      return v == null ? '' : String(v)
    }
    return ''
  })
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

    // Generic condition builder (trigger_config.conditions): all must match.
    if (!evaluateConditions(cfg.conditions, ctx.payload)) continue

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
          const recipient = await resolveWorkflowRecipient(ctx, ac)
          const to = String(ac.to ?? recipient?.email ?? '').trim()
          if (!to || !to.includes('@')) {
            results.push({ action: 'send_email', status: 'skipped', note: 'No recipient email' })
          } else {
            const subject = interpolate(String(ac.subject ?? 'A message from Curvvtech'), recipient, ctx)
            const bodyRaw = interpolate(String(ac.body ?? ac.message ?? ''), recipient, ctx)
            const html = bodyRaw.includes('<') ? bodyRaw : `<p>${bodyRaw.replace(/\n/g, '<br/>')}</p>`
            const res = await sendEmail({ to, subject, html, text: bodyRaw || subject })
            if (!res.ok) logger.warn({ err: res.error }, 'workflow_send_email_failed')
            results.push({ action: 'send_email', status: res.ok ? 'sent' : 'failed', provider: res.provider })
          }
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

    const hadError = results.some((r) => r && typeof r === 'object' && 'error' in (r as object))
    const runStatus = results.length === 0 ? 'skipped' : hadError ? 'failed' : 'completed'

    await sql`
      INSERT INTO curvvtech_workflow_runs (workflow_id, entity_type, entity_id, status, result)
      VALUES (${wf.id}::uuid, ${ctx.entity_type}, ${ctx.entity_id}, ${runStatus}, ${JSON.stringify(results)}::jsonb)
    `
  }
}
