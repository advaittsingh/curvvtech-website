export type HealthBreakdown = {
  timeline: number
  budget: number
  tasks: number
  communication: number
  payments: number
  overall: number
}

type HealthInput = {
  progressPct: number
  daysElapsed: number
  totalDays: number
  daysUntilEnd: number | null
  budgetCents: number
  expenseCents: number
  collectedCents: number
  collectionPct: number
  tasksTotal: number
  tasksDone: number
  daysSinceLastContact: number | null
  status: string
}

export function computeHealthBreakdown(input: HealthInput): HealthBreakdown {
  const {
    progressPct,
    daysElapsed,
    totalDays,
    daysUntilEnd,
    budgetCents,
    expenseCents,
    collectedCents,
    collectionPct,
    tasksTotal,
    tasksDone,
    daysSinceLastContact,
    status,
  } = input

  // Timeline: actual progress vs expected schedule
  let timeline = progressPct
  if (totalDays > 0 && status !== 'completed') {
    const expected = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
    if (expected > 0) {
      timeline = Math.min(100, Math.round((progressPct / expected) * 100))
    }
    if (daysUntilEnd != null && daysUntilEnd < 0) {
      timeline = Math.max(0, timeline - 20)
    }
  } else if (status === 'completed') {
    timeline = 100
  }

  // Budget: margin vs quoted budget (expenses eating into revenue)
  let budget = 80
  if (budgetCents > 0) {
    const marginPct = ((budgetCents - expenseCents) / budgetCents) * 100
    budget = Math.min(100, Math.max(0, Math.round(marginPct)))
  } else if (collectedCents > expenseCents) {
    budget = 90
  }

  // Tasks: completion rate (fall back to progress when no tasks)
  const tasks = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : progressPct

  // Communication: recency of client touchpoints
  let communication = 100
  if (daysSinceLastContact != null) {
    if (daysSinceLastContact <= 2) communication = 100
    else if (daysSinceLastContact <= 5) communication = 75
    else if (daysSinceLastContact <= 10) communication = 50
    else if (daysSinceLastContact <= 21) communication = 30
    else communication = 10
  }

  // Payments: collection against budget
  const payments = status === 'completed' ? 100 : collectionPct

  const overall = Math.round(
    timeline * 0.25 + budget * 0.2 + tasks * 0.2 + communication * 0.15 + payments * 0.2,
  )

  return {
    timeline: clamp(timeline),
    budget: clamp(budget),
    tasks: clamp(tasks),
    communication: clamp(communication),
    payments: clamp(payments),
    overall: clamp(overall),
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
