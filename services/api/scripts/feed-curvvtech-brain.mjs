/**
 * Loads Curvvtech admin records and the desktop Curvvtech folder into the
 * Business OS brain (bos_knowledge_entries). Replaces only rows this script
 * wrote (source = curvvtech-feed). Does not copy credentials.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const here = path.dirname(new URL(import.meta.url).pathname);
const apiRoot = path.resolve(here, "..");
dotenv.config({ path: path.join(apiRoot, ".env.aws") });
dotenv.config({ path: path.join(apiRoot, ".env") });
if (process.env.FEED_ENV_FILE) dotenv.config({ path: process.env.FEED_ENV_FILE, override: true });

const URL_KEYS = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL_UNPOOLED", "NEON_DATABASE_URL"];
const databaseUrl = URL_KEYS.map((key) => process.env[key]).find((value) => value && value.startsWith("postgres")) || "";
if (!databaseUrl) {
  console.error("No Postgres URL in the environment.", URL_KEYS.map((key) => `${key}:${Boolean(process.env[key])}`).join(" "));
  process.exit(1);
}

const REDACT = /password|secret|token|smtp_|bank_|upi_|razorpay|api_key|hash|pan_number|portal_invite|preview_token|cvv|account_number/i;
const SKIP_DIR = new Set(["node_modules", ".git", "dist", ".next", ".cursor", "credential-secrets", "browser-artifacts", "uploads", ".vercel"]);
const SKIP_FILE = /(\.env($|\.))|rzp-key|credential|id_rsa|\.pem$|\.key$|secrets?/i;
const CURVVTECH_ROOT = "/Users/advaitsingh/Desktop/Curvvtech ";

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

function inr(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  return `INR ${(n / 100).toLocaleString("en-IN")}`;
}

function clean(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value == null || value === "") continue;
    if (REDACT.test(key)) continue;
    if (typeof value === "string" && value.startsWith("data:")) continue;
    if (["id", "createdAt", "updatedAt", "created_at", "updated_at", "user_id", "tenant_id", "auth_sub"].includes(key)) continue;
    out[key] = typeof value === "string" ? value.slice(0, 1500) : value;
  }
  return out;
}

function line(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v).slice(0, 400) : v}`)
    .join("\n");
}

async function tableExists(name) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rowCount > 0;
}

async function rows(name, sql) {
  if (!(await tableExists(name))) return [];
  const r = await pool.query(sql);
  return r.rows;
}

async function ensureOrg() {
  const existing = await pool.query(`SELECT id, name, slug FROM bos_organizations WHERE slug = 'curvvtech' LIMIT 1`);
  if (existing.rows[0]) return existing.rows[0];
  const created = await pool.query(
    `INSERT INTO bos_organizations (name, slug, industry, plan, status)
     VALUES ('Curvvtech', 'curvvtech', 'Software and integrated systems', 'active', 'active')
     RETURNING id, name, slug`
  );
  const org = created.rows[0];
  const staff = await pool.query(
    `SELECT id FROM users WHERE email ILIKE '%@curvvtech.com' OR email ILIKE '%@curvvtech.%' ORDER BY created_at`
  );
  const members = staff.rows.length ? staff.rows : (await pool.query(`SELECT id FROM users ORDER BY created_at LIMIT 1`)).rows;
  for (const member of members) {
    await pool.query(
      `INSERT INTO bos_organization_members (organization_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (organization_id, user_id) DO NOTHING`,
      [org.id, member.id]
    );
  }
  const defs = await pool.query(
    `SELECT id, name FROM bos_agent_definitions WHERE slug = ANY($1)`,
    [["sales", "ad-manager", "finance", "operations", "ceo-assistant"]]
  );
  for (const def of defs.rows) {
    await pool.query(
      `INSERT INTO bos_agents (organization_id, definition_id, name, status)
       SELECT $1, $2, $3, 'active'
       WHERE NOT EXISTS (
         SELECT 1 FROM bos_agents WHERE organization_id = $1 AND definition_id = $2
       )`,
      [org.id, def.id, def.name]
    );
  }
  return org;
}

async function walk(dir, depth, acc) {
    if (depth > 6 || acc.length > 800) return;
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (acc.length > 800) return;
    if (entry.name.startsWith(".") && entry.name !== ".cursor") continue;
    if (SKIP_DIR.has(entry.name) || SKIP_FILE.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, depth + 1, acc);
      continue;
    }
    if (!/\.(pdf|md|txt|docx|html|csv)$/i.test(entry.name)) continue;
    if (SKIP_FILE.test(entry.name)) continue;
    const rel = path.relative(CURVVTECH_ROOT, full);
    let size = 0;
    try {
      size = (await stat(full)).size;
    } catch {
      size = 0;
    }
    acc.push(`${rel} (${Math.round(size / 1024)} KB)`);
  }
}

async function loadBackup(file) {
  const { readFileSync } = await import("node:fs");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const tables = raw.tables || {};
  const clients = (tables.clients || []).filter((row) => !row.deleted_at);
  const clientName = new Map(clients.map((row) => [row.id, row.name]));
  const projects = (tables.projects || [])
    .filter((row) => !row.archived_at)
    .map((row) => ({ ...row, client_name: clientName.get(row.client_id) || "" }));
  const projectName = new Map((tables.projects || []).map((row) => [row.id, row.name]));
  const invoices = (tables.invoices || []).map((row) => ({
    ...row,
    client_name: clientName.get(row.client_id) || "",
    project_name: projectName.get(row.project_id) || "",
  }));
  return {
    takenAt: raw.takenAt,
    settings: tables.company_settings || [],
    services: tables.cms_services || [],
    pages: tables.cms_pages || [],
    clients,
    projects,
    invoices,
    leads: tables.crm_leads || [],
    portfolio: (tables.cms_portfolio || []).slice(0, 40),
    team: tables.cms_team_members || [],
    blogs: (tables.blogs || []).slice(0, 40),
  };
}

async function main() {
  const org = await ensureOrg();
  const entries = [];
  const backup = process.env.BACKUP_JSON ? await loadBackup(process.env.BACKUP_JSON) : null;

  const settings = backup ? backup.settings : await rows("company_settings", `SELECT * FROM company_settings ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`);
  const services = backup ? backup.services : await rows("cms_services", `SELECT title, slug, description, status, published, price_label, sort_order FROM cms_services ORDER BY sort_order`);
  const pages = backup ? backup.pages : await rows("cms_pages", `SELECT slug, title, page_type, status FROM cms_pages ORDER BY sort_order`);
  const clients = backup ? backup.clients : await rows(
    "clients",
    `SELECT name, company, email, phone, industry, website, status, notes, contract_notes, referred_by, portal_status, is_archived
     FROM clients WHERE deleted_at IS NULL ORDER BY name`
  );
  const projects = backup ? backup.projects : await rows(
    "projects",
    `SELECT p.name, p.status, p.progress_pct, p.project_type, p.current_phase, p.internal_notes, p.budget_cents, p.quoted_cents,
            p.live_url, p.priority, p.start_date, p.target_end_date, c.name AS client_name
     FROM projects p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.archived_at IS NULL
     ORDER BY p."updatedAt" DESC NULLS LAST`
  );
  const invoices = backup ? backup.invoices : await rows(
    "invoices",
    `SELECT i.invoice_number, i.status, i.amount_cents, i.tax_cents, i.total_cents, i.due_at, i.paid_at, c.name AS client_name, p.name AS project_name
     FROM invoices i
     LEFT JOIN clients c ON c.id = i.client_id
     LEFT JOIN projects p ON p.id = i.project_id
     ORDER BY i."createdAt" DESC NULLS LAST`
  );
  const leads = backup ? backup.leads : await rows(
    "crm_leads",
    `SELECT name, company, source, status, project_type, budget, timeline, requirements, deal_value_cents, priority, probability
     FROM crm_leads ORDER BY "updatedAt" DESC NULLS LAST`
  );
  const portfolio = backup ? backup.portfolio : await rows("cms_portfolio", `SELECT * FROM cms_portfolio ORDER BY 1 LIMIT 40`);
  const team = backup ? backup.team : await rows("cms_team_members", `SELECT * FROM cms_team_members ORDER BY 1`);
  const blogs = backup ? backup.blogs : await rows("blogs", `SELECT title, slug, status, excerpt FROM blogs ORDER BY 1 LIMIT 40`);

  const profile = settings[0] ? clean(settings[0]) : {};
  const brief = [
    "Curvvtech is a software company. Wordmark: curvvtech. In sentences: Curvvtech.",
    "Public site: https://curvvtech.com. Admin: https://admin.curvvtech.com.",
    "The company builds websites, mobile apps, backends, AI and automation, custom software, and SaaS products.",
    profile.company_name ? `Legal / settings name: ${profile.company_name}` : "Settings name: Curvvtech",
    profile.address ? `Address: ${profile.address}` : "",
    profile.phone ? `Phone on file: ${profile.phone}` : "",
    profile.email_from ? `Email from: ${profile.email_from}` : "",
    profile.gst_number ? `GST on file: ${profile.gst_number}` : "",
    `Services on the website (${services.length}): ${services.map((s) => s.title).join(", ") || "none loaded"}.`,
    `Clients in the admin (${clients.filter((c) => !c.is_archived).length} active): ${clients.filter((c) => !c.is_archived).map((c) => c.name).join(", ") || "none"}.`,
    `Projects (${projects.length}): ${projects.map((p) => `${p.name} [${p.status}]`).join("; ") || "none"}.`,
    `Invoices (${invoices.length}). Leads (${leads.length}).`,
    "Bank accounts, SMTP passwords, payment keys, and session tokens are not stored in this brain.",
    backup ? `Admin snapshot taken ${backup.takenAt}. Later admin edits are not in this copy until the live database is fed.` : "Loaded from the live admin database.",
    "This knowledge is company context. It does not authorize payment, hiring, signature, or sending.",
  ]
    .filter(Boolean)
    .join("\n");

  entries.push({ domain: "company", title: "Curvvtech company brief", content: brief, pinned: true, key: "company-brief" });
  if (Object.keys(profile).length) {
    entries.push({ domain: "company", title: "Company settings", content: line(profile), pinned: false, key: "company-settings" });
  }
  if (services.length) {
    entries.push({
      domain: "services",
      title: "Website services",
      content: services.map((s) => `${s.title} (${s.slug}) - ${s.description || ""} [${s.status || (s.published ? "published" : "draft")}] ${s.price_label || ""}`.trim()).join("\n"),
      pinned: true,
      key: "services",
    });
  }
  if (pages.length) {
    entries.push({
      domain: "website",
      title: "Website pages",
      content: pages.map((p) => `${p.title} /${p.slug} [${p.status}] ${p.page_type}`).join("\n"),
      pinned: false,
      key: "pages",
    });
  }
  for (const client of clients) {
    const body = clean(client);
    entries.push({
      domain: "clients",
      title: `Client: ${client.name}`,
      content: line(body),
      pinned: false,
      key: `client:${client.name}`,
    });
  }
  for (const project of projects) {
    const body = clean({
      ...project,
      budget: inr(project.budget_cents),
      quoted: inr(project.quoted_cents),
    });
    delete body.budget_cents;
    delete body.quoted_cents;
    entries.push({
      domain: "projects",
      title: `Project: ${project.name}`,
      content: line(body),
      pinned: false,
      key: `project:${project.name}`,
    });
  }
  if (invoices.length) {
    entries.push({
      domain: "finance",
      title: "Admin invoices",
      content: invoices
        .map((inv) => `${inv.invoice_number} ${inv.client_name || ""} ${inv.project_name || ""} ${inv.status} ${inr(inv.total_cents || inv.amount_cents)} tax ${inr(inv.tax_cents)} paid ${inv.paid_at || "unpaid"}`.trim())
        .join("\n"),
      pinned: false,
      key: "invoices",
    });
  }
  for (const lead of leads) {
    const body = clean({ ...lead, deal: inr(lead.deal_value_cents) });
    delete body.deal_value_cents;
    entries.push({
      domain: "leads",
      title: `Lead: ${lead.name}`,
      content: line(body),
      pinned: false,
      key: `lead:${lead.name}`,
    });
  }
  if (portfolio.length) {
    entries.push({
      domain: "website",
      title: "Portfolio records",
      content: portfolio.map((row) => line(clean(row))).join("\n---\n"),
      pinned: false,
      key: "portfolio",
    });
  }
  if (team.length) {
    entries.push({
      domain: "people",
      title: "Website team",
      content: team.map((row) => line(clean(row))).join("\n---\n"),
      pinned: false,
      key: "team",
    });
  }
  if (blogs.length) {
    entries.push({
      domain: "website",
      title: "Blog posts",
      content: blogs.map((row) => line(clean(row))).join("\n"),
      pinned: false,
      key: "blogs",
    });
  }

  const files = [];
  await walk(CURVVTECH_ROOT, 0, files);
  const byTop = new Map();
  for (const file of files) {
    const top = file.split(path.sep)[0] || "root";
    if (!byTop.has(top)) byTop.set(top, []);
    byTop.get(top).push(file);
  }
  entries.push({
    domain: "folder",
    title: "Curvvtech desktop folder map",
    content: [
      "Desktop folder: Curvvtech.",
      "Live Website - marketing site, admin panel, client portal, and the API that stores this brain.",
      "Tech - in-house software, including Curvvtech Assistant.",
      "Non Tech - invoices, business card, logo, HR, and client documents (proposals, SLAs, NDAs, design system).",
      "Curvvtech Outreach - outreach assets.",
      "Social Media - social creatives.",
      "Reports - reports.",
      "Credentials, payment keys, and .env files are excluded from this index.",
      "",
      ...[...byTop.entries()].map(([top, list]) => `${top}: ${list.length} documents`),
    ].join("\n"),
    pinned: true,
    key: "folder-map",
  });
  for (const [top, list] of byTop) {
    entries.push({
      domain: "folder",
      title: `Folder: ${top}`,
      content: list.slice(0, 200).join("\n"),
      pinned: false,
      key: `folder:${top}`,
    });
  }

  await pool.query(`DELETE FROM bos_knowledge_entries WHERE organization_id = $1 AND source = 'curvvtech-feed'`, [org.id]);
  await pool.query(
    `DELETE FROM bos_memories WHERE organization_id = $1 AND subject_type = 'curvvtech-feed'`,
    [org.id]
  );

  for (const entry of entries) {
    await pool.query(
      `INSERT INTO bos_knowledge_entries
        (organization_id, domain, title, content_text, content_json, source)
       VALUES ($1, $2, $3, $4, $5, 'curvvtech-feed')`,
      [org.id, entry.domain, entry.title, entry.content.slice(0, 12000), JSON.stringify({ pinned: entry.pinned, feed_key: entry.key })]
    );
  }
  await pool.query(
    `INSERT INTO bos_memories (organization_id, memory_type, subject_type, content_text, importance_score)
     VALUES ($1, 'semantic', 'curvvtech-feed', $2, 0.9)`,
    [org.id, brief.slice(0, 2000)]
  );

  const counts = entries.reduce((acc, entry) => {
    acc[entry.domain] = (acc[entry.domain] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    organization: org.slug,
    entries: entries.length,
    clients: clients.length,
    projects: projects.length,
    invoices: invoices.length,
    leads: leads.length,
    services: services.length,
    folderFiles: files.length,
    byDomain: counts,
  }));
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
