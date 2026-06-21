import type { AdminRole } from "../../../lib/adminPermissions.js";
import { normalizeAdminRole, permissionsForRole, ROLE_PERMISSIONS } from "../../../lib/adminPermissions.js";

export type RolesAiInsight = {
  insight: string
  recommended_action: string
  risk_level: 'low' | 'medium' | 'high'
}

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'Full access to every module, team management, and system settings.',
  admin: 'Manages operations, finance, content, and team.',
  sales: 'Leads, clients, and proposals — no finance modules.',
  project_manager: 'Projects, tasks, files, and team coordination.',
  developer: 'Assigned projects and delivery work only.',
  designer: 'Creative project work and content assets.',
  accountant: 'Finance modules with client visibility.',
}

export function getRolesSecurityInsight(): RolesAiInsight {
  const issues: string[] = []

  if (permissionsForRole('sales').some((p: string) => p.startsWith('invoices.'))) {
    issues.push('Sales role has finance permissions.')
  }
  if (permissionsForRole('developer').some((p: string) => p.startsWith('invoices.'))) {
    issues.push('Developer role has finance access.')
  }
  if (permissionsForRole('designer').includes('team.manage')) {
    issues.push('Designer role can manage team settings.')
  }
  if (permissionsForRole('project_manager').includes('team.manage')) {
    issues.push('Project Manager role includes team administration.')
  }
  if (!permissionsForRole('accountant').includes('invoices.edit')) {
    issues.push('Accountant role lacks invoice edit access.')
  }

  if (issues.length === 0) {
    return {
      insight: 'Role permissions follow least-privilege patterns for a growing agency.',
      recommended_action: 'Review roles quarterly as you add modules or hire specialists.',
      risk_level: 'low',
    }
  }

  const primary = issues[0]!
  return {
    insight: primary,
    recommended_action:
      primary.includes('Sales') || primary.includes('finance')
        ? 'Remove edit permission on invoices for non-finance roles.'
        : primary.includes('team')
          ? 'Limit team.manage to Admin and Founder roles only.'
          : 'Tighten role scopes in the permission matrix.',
    risk_level: issues.length >= 2 ? 'high' : 'medium',
  }
}

export function buildRoleCatalog(
  memberCounts: Map<AdminRole, number>,
): {
  role: AdminRole
  label: string
  description: string
  accessTag: string
  department: string
  member_count: number
  permission_count: number
}[] {
  const labels: Record<AdminRole, { label: string; accessTag: string; department: string }> = {
    super_admin: { label: 'Founder / Admin', accessTag: 'Full access', department: 'Leadership' },
    admin: { label: 'Admin', accessTag: 'Full operations', department: 'Operations' },
    sales: { label: 'Sales', accessTag: 'Sales modules', department: 'Sales' },
    project_manager: { label: 'Project Manager', accessTag: 'Project operations', department: 'Operations' },
    developer: { label: 'Developer', accessTag: 'Project delivery', department: 'Engineering' },
    designer: { label: 'Designer', accessTag: 'Creative modules', department: 'Design' },
    accountant: { label: 'Accountant', accessTag: 'Finance modules', department: 'Finance' },
  }

  const roles = Object.keys(ROLE_PERMISSIONS) as AdminRole[]
  return roles.map((role) => ({
    role,
    label: labels[role].label,
    description: ROLE_DESCRIPTIONS[role],
    accessTag: labels[role].accessTag,
    department: labels[role].department,
    member_count: memberCounts.get(role) ?? 0,
    permission_count: permissionsForRole(role).length,
  }))
}

export function aggregateMemberCounts(
  rows: { curvvtech_role: string | null }[],
): Map<AdminRole, number> {
  const map = new Map<AdminRole, number>()
  for (const row of rows) {
    const role = normalizeAdminRole(row.curvvtech_role)
    if (!role) continue
    map.set(role, (map.get(role) ?? 0) + 1)
  }
  return map
}

export const ALL_PERMISSION_COUNT = 15
