import { Router } from "express";
import { sql } from "../../../lib/sqlPool.js";
import { hasPermission } from "../../../lib/adminPermissions.js";
import { isRestrictedProjectRole } from "../../../lib/adminPermissions.js";

const router = Router();

const LIMIT = 6;

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ leads: [], clients: [], projects: [], invoices: [], proposals: [] });
      return;
    }

    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const perms = req.adminPermissions ?? [];
    const restrictedProjects = isRestrictedProjectRole(req.adminRole);
    const userId = req.auth!.sub;

    const [leads, clients, projects, invoices, proposals] = await Promise.all([
      hasPermission(perms, "leads.view")
        ? sql`
            SELECT id, name, email, company, status
            FROM leads
            WHERE name ILIKE ${pattern} OR email ILIKE ${pattern} OR company ILIKE ${pattern}
            ORDER BY "updatedAt" DESC
            LIMIT ${LIMIT}
          `
        : Promise.resolve([]),
      hasPermission(perms, "clients.view")
        ? sql`
            SELECT id, name, email, company, status
            FROM clients
            WHERE deleted_at IS NULL AND is_archived = false
              AND (name ILIKE ${pattern} OR email ILIKE ${pattern} OR company ILIKE ${pattern})
            ORDER BY "updatedAt" DESC
            LIMIT ${LIMIT}
          `
        : Promise.resolve([]),
      hasPermission(perms, "projects.view")
        ? restrictedProjects
          ? sql`
            SELECT p.id, p.name, p.status, c.name AS client_name
            FROM projects p
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}::uuid
            LEFT JOIN clients c ON c.id = p.client_id
            WHERE p.name ILIKE ${pattern} OR c.name ILIKE ${pattern}
            ORDER BY p."updatedAt" DESC
            LIMIT ${LIMIT}
          `
          : sql`
            SELECT p.id, p.name, p.status, c.name AS client_name
            FROM projects p
            LEFT JOIN clients c ON c.id = p.client_id
            WHERE p.name ILIKE ${pattern} OR c.name ILIKE ${pattern}
            ORDER BY p."updatedAt" DESC
            LIMIT ${LIMIT}
          `
        : Promise.resolve([]),
      hasPermission(perms, "invoices.view")
        ? sql`
            SELECT i.id, i.invoice_number, i.status, c.name AS client_name
            FROM invoices i
            LEFT JOIN clients c ON c.id = i.client_id
            WHERE i.invoice_number ILIKE ${pattern} OR c.name ILIKE ${pattern}
            ORDER BY i."updatedAt" DESC
            LIMIT ${LIMIT}
          `
        : Promise.resolve([]),
      hasPermission(perms, "proposals.view")
        ? sql`
            SELECT id, title, status, client_name
            FROM proposals
            WHERE title ILIKE ${pattern} OR client_name ILIKE ${pattern}
            ORDER BY "updatedAt" DESC
            LIMIT ${LIMIT}
          `
        : Promise.resolve([]),
    ]);

    res.json({ leads, clients, projects, invoices, proposals });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
