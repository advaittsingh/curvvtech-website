import { pool } from "../../../db.js";

export async function searchKnowledge(orgId: string, query: string) {
  const r = await pool.query(
    `SELECT id, domain, title, content_text, source, created_at
     FROM bos_knowledge_entries
     WHERE organization_id = $1
       AND (title ILIKE $2 OR content_text ILIKE $2)
     ORDER BY updated_at DESC LIMIT 20`,
    [orgId, `%${query}%`]
  );
  return r.rows;
}

export async function listKnowledge(orgId: string) {
  const r = await pool.query(
    `SELECT * FROM bos_knowledge_entries WHERE organization_id = $1 ORDER BY updated_at DESC`,
    [orgId]
  );
  return r.rows;
}

export async function createKnowledge(orgId: string, data: {
  title: string;
  content_text: string;
  domain?: string;
  created_by?: string;
}) {
  const r = await pool.query(
    `INSERT INTO bos_knowledge_entries (organization_id, domain, title, content_text, source, created_by)
     VALUES ($1, $2, $3, $4, 'manual', $5) RETURNING *`,
    [orgId, data.domain ?? "general", data.title, data.content_text, data.created_by ?? null]
  );
  await pool.query(
    `INSERT INTO bos_memories (organization_id, memory_type, content_text, subject_type)
     VALUES ($1, 'semantic', $2, 'knowledge')`,
    [orgId, `${data.title}: ${data.content_text.slice(0, 500)}`]
  );
  return r.rows[0];
}

export async function listMemories(orgId: string, limit = 30) {
  const r = await pool.query(
    `SELECT id, memory_type, subject_type, content_text, importance_score, created_at
     FROM bos_memories WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [orgId, limit]
  );
  return r.rows;
}

export async function listDocuments(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_documents WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function createDocument(orgId: string, data: { title: string; domain?: string }) {
  const r = await pool.query(
    `INSERT INTO bos_documents (organization_id, title, domain) VALUES ($1, $2, $3) RETURNING *`,
    [orgId, data.title, data.domain ?? "general"]
  );
  return r.rows[0];
}

/** Pinned company brief plus entries that match the question. Knowledge is context, not authority. */
export async function contextForPrompt(orgId: string, query: string, limit = 24) {
  const pinned = await pool.query(
    `SELECT domain, title, left(content_text, 1600) AS content_text
     FROM bos_knowledge_entries
     WHERE organization_id = $1 AND content_json->>'pinned' = 'true'
     ORDER BY updated_at DESC
     LIMIT 6`,
    [orgId]
  );
  const needle = query.replace(/[%_]/g, "").trim().slice(0, 80);
  const matched = needle
    ? await pool.query(
        `SELECT domain, title, left(content_text, 900) AS content_text
         FROM bos_knowledge_entries
         WHERE organization_id = $1
           AND COALESCE(content_json->>'pinned', '') <> 'true'
           AND (title ILIKE $2 OR content_text ILIKE $2 OR domain ILIKE $2)
         ORDER BY updated_at DESC
         LIMIT $3`,
        [orgId, `%${needle}%`, limit]
      )
    : { rows: [] as { domain: string; title: string; content_text: string }[] };
  const rows = [...pinned.rows, ...matched.rows];
  if (rows.length >= 4) return rows.slice(0, limit + 6);
  const recent = await pool.query(
    `SELECT domain, title, left(content_text, 700) AS content_text
     FROM bos_knowledge_entries
     WHERE organization_id = $1
     ORDER BY updated_at DESC
     LIMIT 12`,
    [orgId]
  );
  const seen = new Set(rows.map((row) => row.title));
  for (const row of recent.rows) {
    if (!seen.has(row.title)) rows.push(row);
  }
  return rows.slice(0, limit + 6);
}

export async function getBrainStats(orgId: string) {
  const r = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM bos_knowledge_entries WHERE organization_id = $1) as knowledge_count,
      (SELECT COUNT(*) FROM bos_memories WHERE organization_id = $1) as memory_count,
      (SELECT COUNT(*) FROM bos_documents WHERE organization_id = $1) as document_count`,
    [orgId]
  );
  return r.rows[0];
}
