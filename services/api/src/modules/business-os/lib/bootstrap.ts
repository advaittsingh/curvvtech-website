import { pool } from "../../../db.js";
import { emitEvent } from "./events.js";

const AGENT_SLUGS = ["sales", "ad-manager", "finance", "operations", "ceo-assistant"] as const;

export async function slugify(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  let slug = base || "org";
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const r = await pool.query(`SELECT 1 FROM bos_organizations WHERE slug = $1`, [candidate]);
    if (r.rowCount === 0) return candidate;
    n++;
  }
}

export async function bootstrapOrganization(userId: string, name: string, industry?: string) {
  const slug = await slugify(name);
  const orgRes = await pool.query(
    `INSERT INTO bos_organizations (name, slug, industry)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, slug, industry ?? null]
  );
  const org = orgRes.rows[0];

  await pool.query(
    `INSERT INTO bos_organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner')`,
    [org.id, userId]
  );

  const defs = await pool.query(`SELECT id, slug, name FROM bos_agent_definitions WHERE slug = ANY($1)`, [
    AGENT_SLUGS,
  ]);

  for (const def of defs.rows) {
    await pool.query(
      `INSERT INTO bos_agents (organization_id, definition_id, name, status)
       VALUES ($1, $2, $3, 'active')`,
      [org.id, def.id, def.name]
    );
  }

  await pool.query(
    `INSERT INTO bos_workflow_definitions (organization_id, slug, name, description, trigger_type, trigger_config_json, graph_json)
     VALUES ($1, 'lead-to-revenue', 'Lead to Revenue Pipeline', 'Default end-to-end sales workflow', 'event', $2, $3)`,
    [
      org.id,
      JSON.stringify({ event: "lead.captured" }),
      JSON.stringify([
        { step: "qualify", agent: "sales" },
        { step: "meeting", agent: "sales" },
        { step: "proposal", agent: "sales" },
        { step: "invoice", agent: "finance" },
        { step: "notify", agent: "ceo-assistant" },
      ]),
    ]
  );

  await seedDemoData(org.id);

  await emitEvent(org.id, "org.created", { organizationId: org.id });

  return org;
}

async function seedDemoData(orgId: string) {
  await pool.query(
    `INSERT INTO bos_recommendations (organization_id, title, action_text, expected_impact_json, confidence_score)
     VALUES ($1, 'Increase Meta spend', 'Increase Meta spend by ₹12,000/day', $2, 89)`,
    [orgId, JSON.stringify({ revenue: "+22%" })]
  );

  await pool.query(
    `INSERT INTO bos_risks (organization_id, risk_type, severity, title, detail_json, potential_loss_cents, confidence_score, suggested_action)
     VALUES ($1, 'inventory', 'high', 'Inventory Risk — SKU #2847', $2, 17000000, 96, 'Approve reorder today')`,
    [orgId, JSON.stringify({ sku: "SKU #2847", daysUntilStockout: 4 })]
  );

  await pool.query(
    `INSERT INTO bos_knowledge_entries (organization_id, domain, title, content_text, source)
     VALUES ($1, 'policy', 'Minimum margin policy', 'We never discount services below 15% margin.', 'manual')`,
    [orgId]
  );
}

export async function listUserOrganizations(userId: string) {
  const r = await pool.query(
    `SELECT o.id, o.name, o.slug, o.plan, o.status, m.role, o.created_at
     FROM bos_organizations o
     JOIN bos_organization_members m ON m.organization_id = o.id
     WHERE m.user_id = $1
     ORDER BY o.name`,
    [userId]
  );
  return r.rows;
}
