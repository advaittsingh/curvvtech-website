export type ManagerAction = {
  id: string
  label: string
  type: 'invoice' | 'meeting' | 'followup' | 'deploy' | 'milestone' | 'task' | 'plan'
  priority: 'high' | 'medium' | 'low'
}

export type ManagerBrief = {
  greeting: string
  summary_lines: string[]
  suggested_actions: ManagerAction[]
  estimated_completion: string
  awaiting: string[]
  outstanding_cents: number
  priorities: string[]
}

type BriefInput = {
  projectName: string
  userName?: string
  status: string
  progressPct: number
  pendingCents: number
  budgetCents: number
  daysUntilEnd: number | null
  daysSinceLastContact: number | null
  openMilestones: { title?: string }[]
  recentCompletedMilestones: { title?: string; completed_at?: string }[]
  openTasks: { title?: string; priority?: string }[]
  recentActivity: { title: string; event_type: string; created_at: string }[]
  portalLastLogin: string | null
  nextMilestone: string | null
  healthOverall: number
}

export function buildManagerBrief(input: BriefInput): ManagerBrief {
  const firstName = input.userName?.split(/[@.\s]/)[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Good afternoon, ${firstName}` : `Good evening, ${firstName}`

  const summaryLines: string[] = []

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const recentDone = input.recentCompletedMilestones.find((m) => {
    if (!m.completed_at) return false
    return new Date(m.completed_at) >= yesterday
  })
  if (recentDone?.title) {
    summaryLines.push(`${recentDone.title} completed recently.`)
  } else if (input.recentActivity.length > 0) {
    const latest = input.recentActivity[0]
    if (latest) summaryLines.push(`${latest.title}.`)
  }

  const waitingApproval = input.openTasks.find((t) =>
    /approval|review|feedback|client/i.test(t.title ?? ''),
  )
  if (waitingApproval) {
    summaryLines.push(`Waiting for approval: ${waitingApproval.title}.`)
  } else if (input.openMilestones.length > 0 && input.nextMilestone) {
    summaryLines.push(`Next up: ${input.nextMilestone}.`)
  }

  if (input.pendingCents > 0) {
    summaryLines.push(`${formatInrAmount(input.pendingCents)} outstanding.`)
  }

  if (input.daysSinceLastContact != null && input.daysSinceLastContact >= 3) {
    summaryLines.push(`Client hasn't been contacted for ${input.daysSinceLastContact} days.`)
  } else if (input.portalLastLogin) {
    const days = daysBetween(new Date(input.portalLastLogin), new Date())
    if (days <= 2) summaryLines.push('Client viewed portal recently.')
  }

  if (summaryLines.length === 0) {
    summaryLines.push(`${input.projectName} is at ${input.progressPct}% progress.`)
  }

  let estimated = 'TBD'
  if (input.daysUntilEnd != null && input.daysUntilEnd > 0) {
    const d = new Date()
    d.setDate(d.getDate() + input.daysUntilEnd)
    estimated = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } else if (input.status === 'completed') {
    estimated = 'Completed'
  } else if (input.progressPct >= 90) {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    estimated = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }
  summaryLines.push(`Estimated completion: ${estimated}.`)

  const actions: ManagerAction[] = []
  if (input.pendingCents > 0) {
    actions.push({ id: 'send-invoice', label: 'Send invoice', type: 'invoice', priority: 'high' })
  }
  if (input.daysSinceLastContact != null && input.daysSinceLastContact >= 5) {
    actions.push({ id: 'followup-client', label: 'Follow up client', type: 'followup', priority: 'high' })
  }
  if (waitingApproval || input.openMilestones.length > 0) {
    actions.push({ id: 'schedule-review', label: 'Schedule review meeting', type: 'meeting', priority: 'medium' })
  }
  if (input.progressPct >= 60 && input.status === 'in_progress') {
    actions.push({ id: 'deploy-staging', label: 'Deploy staging', type: 'deploy', priority: 'medium' })
  }
  if (input.openTasks.length > 0) {
    actions.push({ id: 'complete-tasks', label: `Complete ${input.openTasks.length} open task${input.openTasks.length > 1 ? 's' : ''}`, type: 'task', priority: 'medium' })
  }
  if (input.healthOverall < 60) {
    actions.push({ id: 'generate-plan', label: 'Generate recovery plan', type: 'plan', priority: 'high' })
  }
  if (actions.length === 0) {
    actions.push({ id: 'log-update', label: 'Log project update', type: 'followup', priority: 'low' })
  }

  const awaiting: string[] = []
  if (waitingApproval) awaiting.push(`Client approval on ${waitingApproval.title}`)
  if (input.daysSinceLastContact != null && input.daysSinceLastContact >= 5) awaiting.push('Client feedback')
  if (input.openMilestones.some((m) => /handover|launch|deploy/i.test(m.title ?? ''))) {
    awaiting.push('Final handover sign-off')
  }

  const priorities = input.openTasks
    .filter((t) => t.priority === 'high' || t.priority === 'urgent')
    .slice(0, 3)
    .map((t) => t.title ?? 'Task')
  if (priorities.length === 0 && input.nextMilestone) {
    priorities.push(`Complete ${input.nextMilestone}`)
  }

  return {
    greeting,
    summary_lines: summaryLines,
    suggested_actions: actions.slice(0, 5),
    estimated_completion: estimated,
    awaiting,
    outstanding_cents: input.pendingCents,
    priorities,
  }
}

function formatInrAmount(cents: number): string {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86400000)
}