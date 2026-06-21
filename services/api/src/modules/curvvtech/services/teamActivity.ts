export type RawTeamActivity = {
  action?: string | null
  entity_type?: string | null
  actor_name?: string | null
  task_title?: string | null
  project_name?: string | null
  invoice_number?: string | null
  details?: Record<string, unknown> | null
}

export function formatTeamActivityMessage(row: RawTeamActivity): string {
  const actor = row.actor_name ?? 'A team member'
  const action = String(row.action ?? '')
  const details = (row.details ?? {}) as Record<string, unknown>
  const task = row.task_title ?? 'a task'
  const project = row.project_name ? ` on ${row.project_name}` : ''
  const inv = row.invoice_number ?? (details.invoice_number as string | undefined)

  switch (action) {
    case 'task_created':
      return `${actor} created task "${task}"${project}`
    case 'task_status_changed':
      return `${actor} moved "${task}" to ${String(details.to ?? details.status ?? 'updated')}`
    case 'task_completed':
      return `${actor} completed "${task}"${project}`
    case 'plan_generated':
      return `${actor} generated a task plan${project}`
    case 'invoice_created':
      return `${actor} created invoice ${inv ? `#${inv}` : ''}`.trim()
    case 'invoice_status_changed':
      return `${actor} updated invoice ${inv ? `#${inv}` : ''} to ${String(details.to ?? 'updated')}`
    case 'payment_link_sent':
      return `${actor} sent a payment link${inv ? ` for ${inv}` : ''}`
    case 'file_uploaded':
      return `${actor} uploaded ${String(details.name ?? 'project files')}`
    case 'file_deleted':
      return `${actor} removed a file`
    case 'file_organized':
      return `${actor} organized project files`
    case 'lead_created':
      return `${actor} created a new lead`
    case 'client_created':
      return `${actor} created a new client`
    case 'lead_status_changed':
      return `${actor} moved a lead to ${String(details.to ?? 'next stage')}`
    default:
      return `${actor} ${action.replace(/_/g, ' ')}`
  }
}

export function workloadLabel(utilizationPct: number): string {
  if (utilizationPct >= 91) return 'Overloaded'
  if (utilizationPct >= 71) return 'High'
  if (utilizationPct >= 41) return 'Medium'
  if (utilizationPct > 0) return 'Light'
  return 'Idle'
}
