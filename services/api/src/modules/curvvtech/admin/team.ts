import { Router } from "express";
import { pool } from "../../../db.js";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";
import { formatTeamActivityMessage, workloadLabel } from "../services/teamActivity.js";
import { getTeamInsight } from "../services/teamIntelligence.js";
import {
  aggregateMemberCounts,
  ALL_PERMISSION_COUNT,
  buildRoleCatalog,
  getRolesSecurityInsight,
} from "../services/rolesIntelligence.js";

const router = Router();
router.use(requireCurvvtechAdmin);

function departmentFromRole(role: string | null | undefined, cpDept: string | null | undefined): string {
  if (cpDept?.trim()) return cpDept.trim();
  const map: Record<string, string> = {
    developer: "engineering",
    designer: "design",
    project_manager: "operations",
    sales: "sales",
    admin: "operations",
    super_admin: "operations",
    manager: "operations",
    accountant: "operations",
    member: "general",
  };
  return map[String(role ?? "").toLowerCase()] ?? "general";
}

const MEMBER_AGG = `
  SELECT
    u.id::text AS user_id,
    u.email,
    u.curvvtech_role AS role,
    COALESCE(NULLIF(up.display_name, ''), split_part(u.email, '@', 1), 'Team member') AS name,
    up.phone,
    cp.id::text AS compensation_profile_id,
    cp.monthly_salary_cents,
    cp.role_title,
    cp.department AS cp_department,
    cp.employment_type,
    cp.joined_at,
    u.created_at::text AS user_created_at,
    COUNT(DISTINCT pm.project_id)::int AS project_count,
    COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'cancelled'))::int AS active_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS completed_tasks
  FROM users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
  LEFT JOIN compensation_profiles cp ON cp.user_id = u.id AND cp.is_active
  LEFT JOIN project_members pm ON pm.user_id = u.id
  LEFT JOIN tasks t ON t.assignee_user_id = u.id::text
  WHERE u.curvvtech_role IS NOT NULL
  GROUP BY u.id, u.email, u.curvvtech_role, up.display_name, up.phone,
    cp.id, cp.monthly_salary_cents, cp.role_title, cp.department, cp.employment_type, cp.joined_at, u.created_at
`;

function mapMember(row: Record<string, unknown>) {
  const active = Number(row.active_tasks ?? 0);
  const completed = Number(row.completed_tasks ?? 0);
  const total = active + completed;
  const utilization_pct = Math.min(100, active * 12);
  const department = departmentFromRole(row.role as string, row.cp_department as string);
  return {
    user_id: row.user_id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? null,
    role: row.role,
    role_title: row.role_title ?? null,
    department,
    project_count: Number(row.project_count ?? 0),
    active_tasks: active,
    completed_tasks: completed,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    utilization_pct,
    workload: workloadLabel(utilization_pct),
    status: "active",
    monthly_salary_cents: row.monthly_salary_cents != null ? Number(row.monthly_salary_cents) : null,
    joined_at: row.joined_at ?? row.user_created_at ?? null,
    compensation_profile_id: row.compensation_profile_id ?? null,
  };
}

router.get("/dashboard", async (_req, res) => {
  try {
    const membersResult = await pool.query(`${MEMBER_AGG} ORDER BY name ASC`);
    const members = membersResult.rows.map((r) => mapMember(r as Record<string, unknown>));

    const summary = {
      member_count: members.length,
      department_count: new Set(members.map((m) => m.department)).size,
      open_tasks: members.reduce((s, m) => s + m.active_tasks, 0),
      capacity_used_pct:
        members.length > 0
          ? Math.round(members.reduce((s, m) => s + m.utilization_pct, 0) / members.length)
          : 0,
    };

    const deptMap = new Map<string, { member_count: number; open_tasks: number }>();
    for (const m of members) {
      const cur = deptMap.get(m.department) ?? { member_count: 0, open_tasks: 0 };
      cur.member_count += 1;
      cur.open_tasks += m.active_tasks;
      deptMap.set(m.department, cur);
    }
    const departments = [...deptMap.entries()]
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.open_tasks - a.open_tasks);

    const workload = members
      .map((m) => ({
        user_id: m.user_id,
        name: m.name,
        utilization_pct: m.utilization_pct,
        active_tasks: m.active_tasks,
        workload: m.workload,
      }))
      .sort((a, b) => b.utilization_pct - a.utilization_pct);

    const activityRows = await pool.query(
      `SELECT
        al.id::text,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al."createdAt"::text AS created_at,
        COALESCE(NULLIF(up.display_name, ''), u.email, 'Team member') AS actor_name,
        t.title AS task_title,
        p.name AS project_name,
        inv.invoice_number
      FROM activity_logs al
      LEFT JOIN users u ON u.id::text = al.clerk_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN tasks t ON t.id::text = al.entity_id AND al.entity_type = 'task'
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN invoices inv ON inv.id::text = al.entity_id AND al.entity_type = 'invoice'
      ORDER BY al."createdAt" DESC
      LIMIT 15`,
    );

    const activity = activityRows.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      message: formatTeamActivityMessage({
        action: r.action as string,
        entity_type: r.entity_type as string,
        actor_name: r.actor_name as string,
        task_title: r.task_title as string,
        project_name: r.project_name as string,
        invoice_number: r.invoice_number as string,
        details: r.details as Record<string, unknown>,
      }),
      actor_name: r.actor_name,
      created_at: r.created_at,
    }));

    const positions = await sql`
      SELECT id::text, title, department, status, notes, "createdAt"::text AS created_at
      FROM open_positions
      WHERE status = 'open'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    const ai = await getTeamInsight();

    res.json({
      summary,
      members,
      departments,
      workload,
      activity,
      open_positions: positions,
      ai_insight: ai,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/members/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const memberResult = await pool.query(`${MEMBER_AGG} AND u.id = $1::uuid`, [userId]);
    if (memberResult.rows.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const member = mapMember(memberResult.rows[0] as Record<string, unknown>);

    const projects = await pool.query(
      `SELECT p.id::text, p.name, p.status
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1::uuid
       ORDER BY p.name ASC
       LIMIT 20`,
      [userId],
    );

    const tasks = await pool.query(
      `SELECT t.id::text, t.title, t.status, t.due_at::text, p.name AS project_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_user_id = $1
       ORDER BY t."updatedAt" DESC
       LIMIT 15`,
      [userId],
    );

    const activityRows = await pool.query(
      `SELECT
        al.id::text,
        al.action,
        al.entity_type,
        al.details,
        al."createdAt"::text AS created_at,
        t.title AS task_title,
        p.name AS project_name,
        inv.invoice_number
      FROM activity_logs al
      LEFT JOIN tasks t ON t.id::text = al.entity_id AND al.entity_type = 'task'
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN invoices inv ON inv.id::text = al.entity_id AND al.entity_type = 'invoice'
      WHERE al.clerk_user_id = $1
      ORDER BY al."createdAt" DESC
      LIMIT 12`,
      [userId],
    );

    const activity = activityRows.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      message: formatTeamActivityMessage({
        action: r.action as string,
        actor_name: String(member.name),
        task_title: r.task_title as string,
        project_name: r.project_name as string,
        invoice_number: r.invoice_number as string,
        details: r.details as Record<string, unknown>,
      }),
      created_at: r.created_at,
    }));

    res.json({ ...member, projects: projects.rows, tasks: tasks.rows, activity });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/capacity", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT u.id::text AS id, u.email,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'cancelled'))::int AS active_tasks
      FROM users u
      LEFT JOIN tasks t ON t.assignee_user_id = u.id::text
      WHERE u.curvvtech_role IS NOT NULL
      GROUP BY u.id, u.email
      ORDER BY u.email
    `;
    res.json(
      (rows as { id: string; email: string; active_tasks: number }[]).map((r) => ({
        ...r,
        utilization_pct: Math.min(100, r.active_tasks * 12),
      })),
    );
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/members", async (_req, res) => {
  try {
    const result = await pool.query(`${MEMBER_AGG} ORDER BY name ASC`);
    res.json(result.rows.map((r) => mapMember(r as Record<string, unknown>)));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/positions", async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id::text, title, department, status, notes, "createdAt"::text AS created_at
      FROM open_positions ORDER BY "createdAt" DESC
    `;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/positions", async (req, res) => {
  try {
    const { title, department, notes } = req.body;
    const row = firstRow(await sql`
      INSERT INTO open_positions (title, department, notes)
      VALUES (${title ?? ''}, ${department ?? null}, ${notes ?? null})
      RETURNING id::text, title, department, status, notes, "createdAt"::text AS created_at
    `);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/roles/dashboard", async (_req, res) => {
  try {
    const memberRows = (await sql`
      SELECT curvvtech_role FROM users WHERE curvvtech_role IS NOT NULL
    `) as { curvvtech_role: string | null }[];

    const memberCounts = aggregateMemberCounts(memberRows);
    const roles = buildRoleCatalog(memberCounts);

    const deptCount = firstRow<{ c: number }>(await sql`
      SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(department), ''), 'general'))::int AS c
      FROM compensation_profiles WHERE is_active
    `);

    const ai = getRolesSecurityInsight();

    res.json({
      summary: {
        role_count: roles.length,
        member_count: memberRows.length,
        permission_count: ALL_PERMISSION_COUNT,
        department_count: Number(deptCount?.c ?? 0) || new Set(roles.map((r) => r.department)).size,
      },
      roles,
      ai_insight: ai,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/roles", async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM roles ORDER BY name`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch("/members/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { curvvtech_role } = req.body as { curvvtech_role?: string | null };
    if (curvvtech_role === undefined) {
      res.status(400).json({ error: "curvvtech_role required" });
      return;
    }
    const norm =
      curvvtech_role === "" || curvvtech_role === null ? null : String(curvvtech_role).toLowerCase();
    const allowed = [
      "admin",
      "manager",
      "member",
      "sales",
      "project_manager",
      "developer",
      "designer",
      "accountant",
      "super_admin",
    ];
    if (norm !== null && !allowed.includes(norm)) {
      res.status(400).json({ error: "Invalid curvvtech_role" });
      return;
    }
    await sql`
      UPDATE users SET curvvtech_role = ${norm}, updated_at = now()
      WHERE id = ${userId}::uuid
    `;
    const result = await pool.query(`${MEMBER_AGG} AND u.id = $1::uuid`, [userId]);
    res.json(result.rows[0] ? mapMember(result.rows[0] as Record<string, unknown>) : {});
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const activityRows = await pool.query(
      `SELECT
        al.id::text,
        al.action,
        al.entity_type,
        al.details,
        al."createdAt"::text AS created_at,
        COALESCE(NULLIF(up.display_name, ''), u.email, 'Team member') AS actor_name,
        t.title AS task_title,
        p.name AS project_name,
        inv.invoice_number
      FROM activity_logs al
      LEFT JOIN users u ON u.id::text = al.clerk_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN tasks t ON t.id::text = al.entity_id AND al.entity_type = 'task'
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN invoices inv ON inv.id::text = al.entity_id AND al.entity_type = 'invoice'
      ORDER BY al."createdAt" DESC
      LIMIT $1`,
      [limit],
    );
    res.json(
      activityRows.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        message: formatTeamActivityMessage({
          action: r.action as string,
          entity_type: r.entity_type as string,
          actor_name: r.actor_name as string,
          task_title: r.task_title as string,
          project_name: r.project_name as string,
          invoice_number: r.invoice_number as string,
          details: r.details as Record<string, unknown>,
        }),
        actor_name: r.actor_name,
        created_at: r.created_at,
      })),
    );
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/activity", async (req, res) => {
  try {
    const auth = req.auth!;
    const { action, entity_type, entity_id, details } = req.body;
    const rows = await sql`
      INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details, "createdAt")
      VALUES (${auth.sub}, ${action ?? "activity"}, ${entity_type ?? null}, ${entity_id ?? null}, ${details ? JSON.stringify(details) : null}::jsonb, NOW())
      RETURNING *
    `;
    res.status(201).json((rows as object[])[0]!);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
