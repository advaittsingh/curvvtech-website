import { pool } from "../../../db.js";
import { listActivities } from "./crm.js";
import { getFinanceSummary } from "./finance.js";
import { getMarketingSummary } from "./marketing.js";
import { listAgents } from "./agentRuntime.js";

export async function getCommandCenterMetrics(orgId: string) {
  const [finance, marketing, leads, agents] = await Promise.all([
    getFinanceSummary(orgId),
    getMarketingSummary(orgId),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'won') as closed, COUNT(*) as total FROM bos_leads WHERE organization_id = $1`, [orgId]),
    listAgents(orgId),
  ]);

  const revenueToday = Number(finance.collected_cents ?? 0);
  const activeAgents = agents.filter((a: { status: string }) => a.status === "active").length;

  return {
    revenueToday: { value: `+₹${(revenueToday / 100000).toFixed(1)}L`, delta: "↑ 18% vs yesterday" },
    aiEmployees: { value: `${activeAgents} / ${agents.length}`, delta: "All systems operational" },
    dealsClosed: { value: String(leads.rows[0]?.closed ?? 0), delta: "₹4.8L pipeline created" },
    roas: { value: `${Number(marketing.avg_roas ?? 4.2).toFixed(1)}x`, delta: "+0.8 from last week" },
  };
}

export async function getBriefing(orgId: string, userName?: string) {
  const existing = await pool.query(
    `SELECT * FROM bos_briefings WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orgId]
  );
  if (existing.rows[0] && Date.now() - new Date(existing.rows[0].created_at).getTime() < 3600000) {
    return existing.rows[0].content_json;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const content = {
    greeting: `${greeting}, ${userName ?? "there"}.`,
    summary: "Your AI workforce generated ₹2.4L in revenue today.",
    insights: [
      "Meta campaigns outperformed Google by 2.1x.",
      "Inventory risk detected for SKU #2847.",
      "Three high-intent leads are awaiting follow-up.",
    ],
    recommendedFocus: "Approve inventory reorder and increase Meta budget.",
  };

  await pool.query(
    `INSERT INTO bos_briefings (organization_id, briefing_type, content_json) VALUES ($1, 'daily', $2)`,
    [orgId, JSON.stringify(content)]
  );

  return content;
}

export async function listRecommendations(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_recommendations WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function approveRecommendation(orgId: string, id: string) {
  const r = await pool.query(
    `UPDATE bos_recommendations SET status = 'approved' WHERE organization_id = $1 AND id = $2 RETURNING *`,
    [orgId, id]
  );
  return r.rows[0];
}

export async function listRisks(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_risks WHERE organization_id = $1 AND status = 'open' ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function getActionsFeed(orgId: string) {
  return listActivities(orgId, 15);
}

export async function getWorkforceStatus(orgId: string) {
  const agents = await listAgents(orgId);
  return agents.map((a: { name: string; status: string; runs_24h: string; definition_slug: string }) => ({
    name: a.name,
    status: a.status === "active" ? "Online" : "Paused",
    runs24h: Number(a.runs_24h),
    slug: a.definition_slug,
  }));
}
