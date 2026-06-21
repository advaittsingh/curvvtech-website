import { firstRow, sql } from '../../../lib/sqlPool.js'
import { workloadLabel } from './teamActivity.js'

export type TeamAiInsight = {
  insight: string
  most_productive_name: string | null
  overloaded_name: string | null
  idle_name: string | null
  recommended_action: string
}

export async function getTeamInsight(): Promise<TeamAiInsight> {
  const members = (await sql`
    SELECT
      COALESCE(NULLIF(up.display_name, ''), u.email) AS name,
      COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'cancelled'))::int AS active_tasks,
      COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS completed_tasks
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN tasks t ON t.assignee_user_id = u.id::text
    WHERE u.curvvtech_role IS NOT NULL
    GROUP BY u.id, up.display_name, u.email
  `) as { name: string; active_tasks: number; completed_tasks: number }[]

  if (members.length === 0) {
    return {
      insight: 'Invite team members and assign roles to unlock workload intelligence.',
      most_productive_name: null,
      overloaded_name: null,
      idle_name: null,
      recommended_action: 'Add employees in Team settings and link them to tasks and projects.',
    }
  }

  const enriched = members.map((m) => {
    const util = Math.min(100, m.active_tasks * 12)
    const total = m.active_tasks + m.completed_tasks
    const completionRate = total > 0 ? Math.round((m.completed_tasks / total) * 100) : 0
    return { ...m, util, completionRate }
  })

  const mostProductive = [...enriched].sort((a, b) => b.completionRate - a.completionRate || b.completed_tasks - a.completed_tasks)[0]
  const overloaded = enriched.find((m) => m.util >= 91)
  const idle = enriched.find((m) => m.util <= 30 && m.active_tasks === 0)

  const assignTarget = [...enriched]
    .filter((m) => m.util < 65)
    .sort((a, b) => a.util - b.util)[0]

  const avgUtil = firstRow<{ avg: number }>(await sql`
    SELECT COALESCE(AVG(sub.util), 0)::int AS avg FROM (
      SELECT LEAST(100, COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'cancelled')) * 12) AS util
      FROM users u
      LEFT JOIN tasks t ON t.assignee_user_id = u.id::text
      WHERE u.curvvtech_role IS NOT NULL
      GROUP BY u.id
    ) sub
  `)

  const avg = Number(avgUtil?.avg ?? 0)

  return {
    insight: `Team capacity at ${avg}% across ${members.length} member${members.length === 1 ? '' : 's'}.`,
    most_productive_name: mostProductive?.name ?? null,
    overloaded_name: overloaded?.name ?? null,
    idle_name: idle?.name ?? null,
    recommended_action: assignTarget
      ? `Assign new tasks to ${assignTarget.name} (${workloadLabel(assignTarget.util)} workload).`
      : overloaded
        ? `Redistribute tasks from ${overloaded.name} to balance workload.`
        : 'Review task assignments weekly to keep utilization balanced.',
  }
}
