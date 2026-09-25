import { Router } from "express";
import { sql, firstRow } from "../../lib/sqlPool.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { badRequest, notFound } from "../../lib/errors.js";
import type { ClientPortalContext } from "./clientAuth.middleware.js";
import {
  listProjectsForClient,
  getProjectForClient,
  getProjectManagerForClient,
  getMilestonesForClient,
  getScopeForClient,
  getRevisionsForClient,
  getTeamForClient,
  assertProjectOwnership,
} from "../shared/projects/projectService.js";
import { listClientDeliverableUrls, listProjectDeliverableUrlsForClient } from "../curvvtech/services/projectPhase23.js";
import { listTasksForClient, completeTaskForClient, getProjectTaskProgress, listProjectTaskProgressForClient } from "../shared/tasks/taskService.js";
import {
  listFilesForClient,
  getDownloadUrlForClient,
  createClientUpload,
  confirmClientUpload,
  abortClientUpload,
  listUploadFoldersForClient,
} from "../shared/files/fileService.js";
import {
  listInvoicesForClient,
  getInvoiceForClient,
  createPaymentOrder,
  verifyAndMarkPaid,
  listPaymentsForClient,
  getInvoiceDocumentForClient,
  getReceiptDocumentForClient,
} from "../shared/invoices/invoiceService.js";
import { getClientTimeline, emitActivityEvent } from "../shared/activity/emitActivityEvent.js";
import {
  listClientNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadCount,
} from "../shared/notifications/notificationService.js";
import { buildClientAiContext, answerClientQuestion } from "./ai/clientAssistant.js";
import { emitNewMessage, notifyInboxInbound } from "../curvvtech/chatSocket.js";

const router = Router();

function ctxOf(req: { portalCtx?: ClientPortalContext }): ClientPortalContext {
  return req.portalCtx as ClientPortalContext;
}

/* ── Dashboard ─────────────────────────────────────────────── */
type HealthLevel = "on_track" | "watch" | "at_risk" | "done";
function deriveHealth(p: { status: string; progress_pct: number; target_end_date: string | null }): HealthLevel {
  if (p.status === "completed" || p.progress_pct >= 100) return "done";
  const now = Date.now();
  const target = p.target_end_date ? new Date(p.target_end_date).getTime() : null;
  if (target && !Number.isNaN(target)) {
    if (now > target) return "at_risk";
    if (target - now < 7 * 86_400_000 && p.progress_pct < 80) return "watch";
  }
  return "on_track";
}

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const ctx = ctxOf(req);
    const projects = await listProjectsForClient(ctx);
    const invoices = await listInvoicesForClient(ctx);
    const pending = invoices.filter((i) => i.status !== "paid");
    const activity = await getClientTimeline(ctx.organizationId, ctx.clientId, { limit: 12 });
    const unread = await unreadCount(ctx.clientId);
    const client = firstRow<{ name: string; company: string | null }>(
      await sql`SELECT name, company FROM clients WHERE id = ${ctx.clientId} LIMIT 1`,
    );
    const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
    const avgProgress = activeProjects.length
      ? Math.round(activeProjects.reduce((a, p) => a + p.progress_pct, 0) / activeProjects.length)
      : 0;

    // Hero = highest-priority active project (fallback to first project).
    const hero = activeProjects[0] ?? projects[0] ?? null;
    const heroWithHealth = hero
      ? { ...hero, health: deriveHealth(hero), project_manager: await getProjectManagerForClient(hero.id) }
      : null;

    // Team for hero project.
    let team: unknown[] = [];
    if (hero) {
      team = (await getTeamForClient(ctx, hero.id)) ?? [];
    }

    // Action center: pending approvals, unpaid invoices, next meeting, open client tasks.
    const pendingApprovals = (await sql`
      SELECT id, title, entity_type, project_id, created_at
      FROM approval_requests
      WHERE client_id = ${ctx.clientId} AND visibility = 'client' AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 6
    `) as unknown[];

    const nextMeeting = firstRow(await sql`
      SELECT id, title, starts_at, meet_url, project_id
      FROM meetings
      WHERE client_id = ${ctx.clientId} AND organization_id = ${ctx.organizationId}
        AND visibility = 'client' AND status <> 'cancelled' AND starts_at >= now()
      ORDER BY starts_at ASC
      LIMIT 1
    `);

    const openTasks = (await sql`
      SELECT t.id, t.title, t.due_at, t.project_id
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.client_id = ${ctx.clientId}
        AND p.organization_id = ${ctx.organizationId}
        AND t.visibility = 'client'
        AND t.status <> 'done'
      ORDER BY t.due_at ASC NULLS LAST
      LIMIT 6
    `) as unknown[];

    res.json({
      client,
      stats: {
        active_projects: activeProjects.length,
        avg_progress: avgProgress,
        pending_invoice_cents: pending.reduce((a, i) => a + (i.total_cents || i.amount_cents), 0),
        unread_notifications: unread,
      },
      hero: heroWithHealth,
      team,
      action_center: {
        approvals: pendingApprovals,
        unpaid_invoices: pending.slice(0, 6),
        next_meeting: nextMeeting ?? null,
        open_tasks: openTasks,
      },
      projects: projects.map((p) => ({ ...p, health: deriveHealth(p) })),
      task_progress: await listProjectTaskProgressForClient(ctx),
      recent_activity: activity,
    });
  }),
);

/* ── Workspace (primary project context) ───────────────────── */
router.get(
  "/workspace",
  asyncHandler(async (req, res) => {
    const ctx = ctxOf(req);
    const projects = await listProjectsForClient(ctx);
    const active = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
    const primary = active[0] ?? projects[0] ?? null;
    let team: unknown[] = [];
    if (primary) {
      team = (await getTeamForClient(ctx, primary.id)) ?? [];
    }
    const lastEvent = firstRow<{ at: Date }>(
      await sql`
        SELECT MAX(created_at) AS at FROM activity_events
        WHERE organization_id = ${ctx.organizationId} AND client_id = ${ctx.clientId} AND visibility = 'client'
      `,
    );
    const taskProgress = await listProjectTaskProgressForClient(ctx);
    res.json({
      primary_project: primary ? { ...primary, health: deriveHealth(primary) } : null,
      projects: active.length ? active : projects,
      task_progress: taskProgress,
      team,
      last_synced_at: lastEvent?.at ?? primary?.updated_at ?? null,
    });
  }),
);

/* ── Project journal (full activity feed) ──────────────────── */
router.get(
  "/journal",
  asyncHandler(async (req, res) => {
    const ctx = ctxOf(req);
    const limit = Math.min(Number(req.query.limit ?? 80), 200);
    const projectId = typeof req.query.project_id === "string" ? req.query.project_id : undefined;
    const entries = await getClientTimeline(ctx.organizationId, ctx.clientId, { projectId, limit });
    res.json({ journal: entries });
  }),
);

/* ── Deliverables (curated client assets) ──────────────────── */
router.get(
  "/deliverables",
  asyncHandler(async (req, res) => {
    const ctx = ctxOf(req);
    const files = await listFilesForClient(ctx, {});
    type FileRow = { id: string; name: string; content_type: string | null; size_bytes: number; created_at: string; project_id: string | null; folder_name: string | null };
    const allRows = files as FileRow[];
    // Deliverables page shows files in the Deliverables folder first; fall back to
    // any client-visible file so nothing published is hidden by a folder mismatch.
    const inDeliverables = allRows.filter((f) => /deliverable/i.test(f.folder_name ?? ""));
    const rows = inDeliverables.length > 0 ? inDeliverables : allRows;

    function categorize(name: string, ct: string | null): { kind: string; label: string; status: string } {
      const n = name.toLowerCase();
      const t = (ct ?? "").toLowerCase();
      if (n.includes("apk") || t.includes("android")) return { kind: "apk", label: "Android APK", status: "ready" };
      if (n.includes(".ipa") || t.includes("ios")) return { kind: "ios", label: "iOS Build", status: "ready" };
      if (n.includes("credential") || n.includes("login") || n.includes("password") || n.includes(".env"))
        return { kind: "credentials", label: "Admin credentials", status: "ready" };
      if (n.includes("host") || n.includes("server") || n.includes("cpanel"))
        return { kind: "hosting", label: "Hosting details", status: "ready" };
      if (n.includes("domain") || n.includes("dns"))
        return { kind: "domain", label: "Domain", status: "ready" };
      if (n.includes("ssl") || n.includes("certificate"))
        return { kind: "ssl", label: "SSL certificate", status: "configured" };
      if (t.includes("zip") || n.includes("source") || n.includes("build") || n.includes("website"))
        return { kind: "website", label: "Website / source package", status: "ready" };
      if (t.startsWith("image/") || n.includes("design") || n.includes("figma") || n.includes("mockup"))
        return { kind: "design", label: "Design deliverable", status: "ready" };
      return { kind: "file", label: name, status: "ready" };
    }

    const deliverables = rows.map((f) => ({
      id: f.id,
      name: f.name,
      kind: categorize(f.name, f.content_type).kind,
      label: categorize(f.name, f.content_type).label,
      status: categorize(f.name, f.content_type).status,
      size_bytes: f.size_bytes,
      created_at: f.created_at,
      project_id: f.project_id,
    }));

    const websiteUrls = (await listClientDeliverableUrls(ctx.clientId, ctx.organizationId)).map((u) => ({
      id: u.id,
      name: u.project_name,
      kind: "website",
      label: u.label,
      status: "live",
      url: u.url,
      project_id: u.project_id,
    }));

    // Fallback: projects with live_url but no deliverable_urls row (pre-migration).
    const projects = await listProjectsForClient(ctx);
    const urlProjectIds = new Set(websiteUrls.map((u) => u.project_id));
    const legacyLiveUrls = projects
      .filter((p) => p.live_url && !urlProjectIds.has(p.id))
      .map((p) => ({
        id: `live-${p.id}`,
        name: p.name,
        kind: "website",
        label: "Live website",
        status: "live",
        url: p.live_url,
        project_id: p.id,
      }));

    res.json({ deliverables: [...websiteUrls, ...legacyLiveUrls, ...deliverables] });
  }),
);

/* ── Billing summary (payment journey) ─────────────────────── */
router.get(
  "/billing/summary",
  asyncHandler(async (req, res) => {
    const ctx = ctxOf(req);
    const invoices = await listInvoicesForClient(ctx);
    const payments = await listPaymentsForClient(ctx);

    const invoiceTotal = invoices.reduce((a, i) => a + (i.total_cents || i.amount_cents), 0);
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((a, i) => a + (i.total_cents || i.amount_cents), 0);

    const projects = await listProjectsForClient(ctx);
    const primary = projects.find((p) => p.status !== "completed") ?? projects[0];

    // The payment journey reflects the CONTRACT, whose milestone percentages sum
    // to 100%. Anchor it to the stored contract value so deleting/adding an
    // individual invoice never rescales the journey (which previously let a
    // deleted step read as "paid" because the invoice sum shrank to match paid).
    let contractValue = invoiceTotal;
    if (primary) {
      const proj = firstRow<{ budget_cents: string | null; quoted_cents: string | null; gst_cents: string | null }>(
        await sql`SELECT budget_cents, quoted_cents, gst_cents FROM projects WHERE id = ${primary.id}::uuid`,
      );
      const budget = Number(proj?.budget_cents ?? 0);
      const quotedPlusGst = Number(proj?.quoted_cents ?? 0) + Number(proj?.gst_cents ?? 0);
      // Floor at the invoice total so extra invoices beyond the contract are never hidden.
      contractValue = Math.max(invoiceTotal, budget, quotedPlusGst);
    }

    const projectValue = contractValue;
    const remaining = Math.max(0, contractValue - paid);
    let paymentSteps: { title: string; status: "paid" | "pending" | "upcoming"; amount_cents?: number }[] = [];

    if (primary) {
      const milestones = (await getMilestonesForClient(ctx, primary.id)) ?? [];
      if (milestones.length > 0) {
        // This is the BILLING payment journey — a step is "paid" once the money
        // for it has arrived, independent of delivery-milestone completion.
        // Each step title usually carries its share (e.g. "Advance (50%)"); use
        // that weight to see whether cumulative payments cover it. Fall back to an
        // even split when no percentage is present.
        const typed = milestones as { title: string; status: string }[];
        const weights = typed.map((m) => {
          const match = /(\d+(?:\.\d+)?)\s*%/.exec(m.title || "");
          return match ? parseFloat(match[1]) : NaN;
        });
        const hasWeights = weights.every((w) => !Number.isNaN(w));
        const paidRatioPct = projectValue > 0 ? (paid / projectValue) * 100 : 0;
        let cumulative = 0;
        paymentSteps = typed.map((m, idx) => {
          const weight = hasWeights ? weights[idx] : 100 / typed.length;
          cumulative += weight;
          // 0.5pt epsilon absorbs rounding in the paid ratio.
          const covered = paidRatioPct >= cumulative - 0.5;
          const status: "paid" | "pending" | "upcoming" = covered
            ? "paid"
            : m.status === "in_progress"
              ? "pending"
              : "upcoming";
          return { title: m.title, status };
        });
      }
    }

    if (paymentSteps.length === 0 && invoices.length > 0) {
      paymentSteps = invoices.map((inv) => ({
        title: inv.invoice_number || "Invoice",
        status: inv.status === "paid" ? ("paid" as const) : ("pending" as const),
        amount_cents: inv.total_cents || inv.amount_cents,
      }));
    }

    res.json({
      project_value_cents: projectValue,
      paid_cents: paid,
      remaining_cents: remaining,
      payment_steps: paymentSteps,
      invoices,
      payments,
    });
  }),
);

/* ── Projects ──────────────────────────────────────────────── */
router.get("/projects", asyncHandler(async (req, res) => {
  res.json({ projects: await listProjectsForClient(ctxOf(req)) });
}));

router.get("/projects/:projectId", asyncHandler(async (req, res) => {
  const p = await getProjectForClient(ctxOf(req), String(req.params.projectId));
  if (!p) throw notFound("Project not found");
  res.json({ project: p });
}));

router.get("/projects/:projectId/timeline", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  if (!(await assertProjectOwnership(ctx, String(req.params.projectId)))) throw notFound("Project not found");
  res.json({ timeline: await getClientTimeline(ctx.organizationId, ctx.clientId, { projectId: String(req.params.projectId), limit: 100 }) });
}));

router.get("/projects/:projectId/milestones", asyncHandler(async (req, res) => {
  const m = await getMilestonesForClient(ctxOf(req), String(req.params.projectId));
  if (m === null) throw notFound("Project not found");
  res.json({ milestones: m });
}));

router.get("/projects/:projectId/tasks", asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const ctx = ctxOf(req);
  const t = await listTasksForClient(ctx, projectId);
  if (t === null) throw notFound("Project not found");
  const progress = await getProjectTaskProgress(ctx, projectId);
  res.json({ tasks: t, progress });
}));

router.get("/projects/:projectId/tasks/progress", asyncHandler(async (req, res) => {
  const progress = await getProjectTaskProgress(ctxOf(req), String(req.params.projectId));
  if (!progress) throw notFound("Project not found");
  res.json({ progress });
}));

router.get("/tasks/progress", asyncHandler(async (req, res) => {
  res.json({ progress: await listProjectTaskProgressForClient(ctxOf(req)) });
}));

router.get("/projects/:projectId/scope", asyncHandler(async (req, res) => {
  const s = await getScopeForClient(ctxOf(req), String(req.params.projectId));
  if (s === null) throw notFound("Project not found");
  res.json({ scope: s });
}));

router.get("/projects/:projectId/activity", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  if (!(await assertProjectOwnership(ctx, String(req.params.projectId)))) throw notFound("Project not found");
  res.json({ activity: await getClientTimeline(ctx.organizationId, ctx.clientId, { projectId: String(req.params.projectId), limit: 100 }) });
}));

router.get("/projects/:projectId/files", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const projectId = String(req.params.projectId);
  if (!(await assertProjectOwnership(ctx, projectId))) throw notFound("Project not found");
  const files = await listFilesForClient(ctx, { projectId });
  const website_urls = await listProjectDeliverableUrlsForClient(ctx.clientId, ctx.organizationId, projectId);
  res.json({ files, website_urls });
}));

router.get("/projects/:projectId/revisions", asyncHandler(async (req, res) => {
  const r = await getRevisionsForClient(ctxOf(req), String(req.params.projectId));
  if (r === null) throw notFound("Project not found");
  res.json({ revisions: r });
}));

router.get("/projects/:projectId/team", asyncHandler(async (req, res) => {
  const t = await getTeamForClient(ctxOf(req), String(req.params.projectId));
  if (t === null) throw notFound("Project not found");
  res.json({ team: t });
}));

router.post("/projects/:projectId/revisions", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const projectId = String(req.params.projectId);
  if (!(await assertProjectOwnership(ctx, projectId))) throw notFound("Project not found");
  const { description } = req.body as { description?: string };
  if (!description?.trim()) throw badRequest("Description required");
  const next = firstRow<{ n: number }>(
    await sql`SELECT COALESCE(MAX(revision_number), 0) + 1 AS n FROM project_revisions WHERE project_id = ${projectId}`,
  );
  const row = firstRow<{ id: string }>(
    await sql`
      INSERT INTO project_revisions (project_id, revision_number, requested_by, description, status, visibility)
      VALUES (${projectId}, ${next?.n ?? 1}, ${`client:${ctx.clientUserId}`}, ${description.trim()}, 'pending', 'client')
      RETURNING id
    `,
  );
  await emitActivityEvent({
    organizationId: ctx.organizationId, clientId: ctx.clientId, projectId,
    actorType: "client", actorId: ctx.clientUserId, actorName: ctx.email,
    eventType: "revision.requested", entityType: "revision", entityId: row?.id,
    title: "Revision requested", body: description.trim(), visibility: "internal",
  });
  res.status(201).json({ id: row?.id, ok: true });
}));

/* ── Tasks ─────────────────────────────────────────────────── */
router.patch("/tasks/:taskId", asyncHandler(async (req, res) => {
  const t = await completeTaskForClient(ctxOf(req), String(req.params.taskId));
  if (!t) throw notFound("Task not found");
  res.json({ task: t });
}));

/* ── Files ─────────────────────────────────────────────────── */
router.get("/files", asyncHandler(async (req, res) => {
  const projectId = typeof req.query.project_id === "string" ? req.query.project_id : undefined;
  res.json({ files: await listFilesForClient(ctxOf(req), projectId ? { projectId } : {}) });
}));

router.get("/files/:fileId/download-url", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const url = await getDownloadUrlForClient(ctx, String(req.params.fileId));
  if (!url) throw notFound("File not found");
  await emitActivityEvent({
    organizationId: ctx.organizationId, clientId: ctx.clientId,
    actorType: "client", actorId: ctx.clientUserId, actorName: ctx.email,
    eventType: "file.downloaded_by_client", entityType: "file", entityId: String(req.params.fileId),
    title: "Client downloaded a file", visibility: "internal",
  });
  res.json(url);
}));

router.get("/projects/:projectId/folders", asyncHandler(async (req, res) => {
  const folders = await listUploadFoldersForClient(ctxOf(req), String(req.params.projectId));
  if (folders === null) throw notFound("Project not found");
  res.json({ folders });
}));

router.post("/files/upload-url", asyncHandler(async (req, res) => {
  const { project_id, file_name, content_type, size_bytes, folder_id } = req.body as {
    project_id?: string; file_name?: string; content_type?: string; size_bytes?: number; folder_id?: string;
  };
  if (!project_id || !file_name || !content_type) throw badRequest("project_id, file_name, content_type required");
  const result = await createClientUpload(ctxOf(req), {
    projectId: project_id, fileName: file_name, contentType: content_type,
    sizeBytes: Number(size_bytes ?? 0), folderId: folder_id,
  });
  if (!result) throw badRequest("Upload not permitted (check project, size, or S3 config)");
  res.json(result);
}));

router.post("/files/:fileId/confirm", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const file = await confirmClientUpload(ctx, String(req.params.fileId));
  if (!file) throw badRequest("Upload incomplete — file missing from storage. Try uploading again.");
  await emitActivityEvent({
    organizationId: ctx.organizationId, clientId: ctx.clientId, projectId: file.project_id,
    actorType: "client", actorId: ctx.clientUserId, actorName: ctx.email,
    eventType: "file.uploaded", entityType: "file", entityId: file.id,
    title: `Client uploaded ${file.name}`,
    body: file.folder_name ? `Added to ${file.folder_name}` : undefined,
    visibility: "internal",
  });
  res.json({ ok: true });
}));

router.delete("/files/:fileId", asyncHandler(async (req, res) => {
  const ok = await abortClientUpload(ctxOf(req), String(req.params.fileId));
  if (!ok) throw notFound("File not found");
  res.status(204).end();
}));

/* ── Billing ───────────────────────────────────────────────── */
router.get("/invoices", asyncHandler(async (req, res) => {
  res.json({ invoices: await listInvoicesForClient(ctxOf(req)) });
}));

router.get("/invoices/:invoiceId", asyncHandler(async (req, res) => {
  const inv = await getInvoiceForClient(ctxOf(req), String(req.params.invoiceId));
  if (!inv) throw notFound("Invoice not found");
  res.json({ invoice: inv });
}));

router.get("/invoices/:invoiceId/pdf", asyncHandler(async (req, res) => {
  const html = await getInvoiceDocumentForClient(ctxOf(req), String(req.params.invoiceId));
  if (!html) throw notFound("Invoice not found");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}));

router.get("/invoices/:invoiceId/receipt", asyncHandler(async (req, res) => {
  const html = await getReceiptDocumentForClient(ctxOf(req), String(req.params.invoiceId));
  if (!html) throw notFound("Receipt not available");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}));

router.post("/invoices/:invoiceId/pay", asyncHandler(async (req, res) => {
  const order = await createPaymentOrder(ctxOf(req), String(req.params.invoiceId));
  if (!order) throw badRequest("Cannot create payment order (invoice paid, too small, or not found)");
  res.json(order);
}));

router.post("/invoices/:invoiceId/verify-payment", asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Record<string, string>;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) throw badRequest("Missing payment fields");
  const result = await verifyAndMarkPaid(ctxOf(req), String(req.params.invoiceId), {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
  });
  if (!result.ok) throw badRequest("Payment verification failed");
  res.json({ ok: true, already_paid: result.alreadyPaid ?? false });
}));

router.get("/payments", asyncHandler(async (req, res) => {
  res.json({ payments: await listPaymentsForClient(ctxOf(req)) });
}));

/* ── Proposals ─────────────────────────────────────────────── */
router.get("/proposals", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const rows = (await sql`
    SELECT p.id, p.title, p.status, p.total_cents, p."createdAt" AS created_at
    FROM proposals p
    WHERE p.client_id = ${ctx.clientId}
      AND p.status IN ('sent','viewed','approved','rejected','converted')
    ORDER BY p."createdAt" DESC
  `) as unknown[];
  res.json({ proposals: rows });
}));

router.get("/proposals/:proposalId", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const proposalId = String(req.params.proposalId);
  const row = firstRow(
    await sql`
      SELECT id, title, status, total_cents, "createdAt" AS created_at
      FROM proposals
      WHERE id = ${proposalId} AND client_id = ${ctx.clientId}
        AND status IN ('sent','viewed','approved','rejected','converted')
      LIMIT 1
    `,
  );
  if (!row) throw notFound("Proposal not found");
  const sections = (await sql`
    SELECT id, sort_order, section_key, content_json
    FROM proposal_sections WHERE proposal_id = ${proposalId}
    ORDER BY sort_order ASC
  `) as unknown[];
  res.json({ proposal: { ...(row as object), sections } });
}));

async function decideProposal(ctx: ClientPortalContext, proposalId: string, decision: "approved" | "rejected") {
  const row = firstRow<{ id: string; title: string }>(
    await sql`SELECT id, title FROM proposals WHERE id = ${proposalId} AND client_id = ${ctx.clientId} LIMIT 1`,
  );
  if (!row) return null;
  if (decision === "approved") {
    await sql`UPDATE proposals SET status = 'approved', approved_at = now(), "updatedAt" = now() WHERE id = ${proposalId}`;
  } else {
    await sql`UPDATE proposals SET status = 'rejected', rejected_at = now(), "updatedAt" = now() WHERE id = ${proposalId}`;
  }
  await emitActivityEvent({
    organizationId: ctx.organizationId, clientId: ctx.clientId,
    actorType: "client", actorId: ctx.clientUserId, actorName: ctx.email,
    eventType: `proposal.${decision}`, entityType: "proposal", entityId: proposalId,
    title: `Proposal ${decision}: ${row.title}`, visibility: "internal",
  });
  return row;
}

router.post("/proposals/:proposalId/approve", asyncHandler(async (req, res) => {
  const r = await decideProposal(ctxOf(req), String(req.params.proposalId), "approved");
  if (!r) throw notFound("Proposal not found");
  res.json({ ok: true });
}));

router.post("/proposals/:proposalId/reject", asyncHandler(async (req, res) => {
  const r = await decideProposal(ctxOf(req), String(req.params.proposalId), "rejected");
  if (!r) throw notFound("Proposal not found");
  res.json({ ok: true });
}));

/* ── Approvals ─────────────────────────────────────────────── */
router.get("/approvals", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const rows = (await sql`
    SELECT id, entity_type, entity_id, title, description, review_url, status, decided_at, comment, created_at
    FROM approval_requests
    WHERE client_id = ${ctx.clientId} AND visibility = 'client' AND status <> 'cancelled'
    ORDER BY created_at DESC
  `) as unknown[];
  res.json({ approvals: rows });
}));

router.get("/approvals/:approvalId", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const row = firstRow(
    await sql`SELECT * FROM approval_requests WHERE id = ${String(req.params.approvalId)} AND client_id = ${ctx.clientId} LIMIT 1`,
  );
  if (!row) throw notFound("Approval not found");
  res.json({ approval: row });
}));

router.post("/approvals/:approvalId/decide", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const { decision, comment } = req.body as { decision?: string; comment?: string };
  if (decision !== "approved" && decision !== "rejected") throw badRequest("decision must be approved|rejected");
  const row = firstRow<{ id: string; title: string; project_id: string | null; entity_type: string; entity_id: string }>(
    await sql`SELECT id, title, project_id, entity_type, entity_id FROM approval_requests WHERE id = ${String(req.params.approvalId)} AND client_id = ${ctx.clientId} AND status = 'pending' LIMIT 1`,
  );
  if (!row) throw notFound("Pending approval not found");
  await sql`
    UPDATE approval_requests
    SET status = ${decision}, decided_by = ${ctx.clientUserId}, decided_at = now(), comment = ${comment ?? null}, updated_at = now()
    WHERE id = ${row.id}
  `;
  if (decision === "approved" && row.entity_type === "change_order") {
    await sql`
      UPDATE project_change_orders
      SET approval_status = 'approved', status = 'approved', "updatedAt" = NOW()
      WHERE id = ${row.entity_id}::uuid
    `;
  }
  await emitActivityEvent({
    organizationId: ctx.organizationId, clientId: ctx.clientId, projectId: row.project_id,
    actorType: "client", actorId: ctx.clientUserId, actorName: ctx.email,
    eventType: decision === "approved" ? "approval.approved" : "approval.rejected",
    entityType: "approval", entityId: row.id,
    title: `${decision === "approved" ? "Approved" : "Rejected"}: ${row.title}`, body: comment ?? null,
    visibility: "client",
  });
  res.json({ ok: true });
}));

/* ── Support / Conversations ───────────────────────────────── */

/** Unread message badge — dedicated path so it never collides with /conversations/:id. */
router.get("/inbox/unread-count", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const row = firstRow<{ unread: number }>(
    await sql`
      SELECT COALESCE(SUM(u.unread), 0)::int AS unread
      FROM conversations c
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unread FROM chat_messages m
        WHERE m.conversation_id = c.id
          AND m.sender <> 'client'
          AND m."createdAt" > COALESCE((c.metadata->>'client_last_read_at')::timestamptz, 'epoch'::timestamptz)
      ) u ON TRUE
      WHERE c.client_id = ${ctx.clientId} AND c.organization_id = ${ctx.organizationId}
    `,
  );
  res.json({ unread_messages: Number(row?.unread ?? 0) });
}));

router.get("/conversations", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const rows = (await sql`
    SELECT id, status, channel, "updatedAt" AS updated_at, started_at
    FROM conversations
    WHERE client_id = ${ctx.clientId} AND organization_id = ${ctx.organizationId}
    ORDER BY "updatedAt" DESC
  `) as unknown[];
  res.json({ conversations: rows });
}));

router.post("/conversations", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const { project_id } = req.body as { project_id?: string };
  const row = firstRow<{ id: string }>(
    await sql`
      INSERT INTO conversations (visitor_id, status, source, channel, client_id, project_id, organization_id)
      VALUES (${`client:${ctx.clientUserId}`}, 'active', 'portal', 'portal', ${ctx.clientId}, ${project_id ?? null}, ${ctx.organizationId})
      RETURNING id
    `,
  );
  res.status(201).json({ id: row?.id });
}));

async function assertConversationOwned(ctx: ClientPortalContext, id: string): Promise<boolean> {
  const row = firstRow<{ id: string }>(
    await sql`SELECT id FROM conversations WHERE id = ${id} AND client_id = ${ctx.clientId} AND organization_id = ${ctx.organizationId} LIMIT 1`,
  );
  return Boolean(row);
}

router.get("/conversations/:id", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  if (!(await assertConversationOwned(ctx, String(req.params.id)))) throw notFound("Conversation not found");
  const conv = firstRow(await sql`SELECT id, status, channel, project_id FROM conversations WHERE id = ${String(req.params.id)} LIMIT 1`);
  res.json({ conversation: conv });
}));

router.get("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  if (!(await assertConversationOwned(ctx, String(req.params.id)))) throw notFound("Conversation not found");
  const rows = (await sql`
    SELECT id, sender, message, "createdAt" AS created_at
    FROM chat_messages WHERE conversation_id = ${String(req.params.id)}
    ORDER BY "createdAt" ASC
  `) as unknown[];
  res.json({ messages: rows });
}));

router.post("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const id = String(req.params.id);
  if (!(await assertConversationOwned(ctx, id))) throw notFound("Conversation not found");
  const { message } = req.body as { message?: string };
  if (!message?.trim()) throw badRequest("Message required");
  const row = firstRow<{ id: string; created_at: string }>(
    await sql`
      INSERT INTO chat_messages (conversation_id, sender, message)
      VALUES (${id}, 'client', ${message.trim()})
      RETURNING id, "createdAt" AS created_at
    `,
  );
  await sql`UPDATE conversations SET "updatedAt" = now() WHERE id = ${id}`;
  const payload = { id: row?.id, conversation_id: id, sender: "client", message: message.trim(), created_at: row?.created_at };
  emitNewMessage(id, payload);
  notifyInboxInbound({ conversationId: id, clientId: ctx.clientId, sender: "client" });
  res.status(201).json({ message: payload });
}));

router.post("/conversations/:id/mark-read", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const id = String(req.params.id);
  if (!(await assertConversationOwned(ctx, id))) throw notFound("Conversation not found");
  await sql`
    UPDATE conversations
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('client_last_read_at', ${new Date().toISOString()})
    WHERE id = ${id}
  `;
  res.json({ ok: true });
}));

/* ── Notifications ─────────────────────────────────────────── */
router.get("/notifications", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const unreadOnly = String(req.query.unread ?? "") === "true";
  res.json({
    notifications: await listClientNotifications(ctx.clientId, { unreadOnly }),
    unread_count: await unreadCount(ctx.clientId),
  });
}));

router.post("/notifications/mark-read", asyncHandler(async (req, res) => {
  await markAllNotificationsRead(ctxOf(req).clientId);
  res.json({ ok: true });
}));

router.post("/notifications/:id/read", asyncHandler(async (req, res) => {
  await markNotificationRead(ctxOf(req).clientId, String(req.params.id));
  res.json({ ok: true });
}));

/* ── Meetings ──────────────────────────────────────────────── */
router.get("/meetings", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const rows = (await sql`
    SELECT id, title, description, starts_at, ends_at, meet_url, recording_url, notes, status, project_id
    FROM meetings
    WHERE client_id = ${ctx.clientId} AND organization_id = ${ctx.organizationId} AND visibility = 'client'
    ORDER BY starts_at DESC
  `) as unknown[];
  res.json({ meetings: rows });
}));

/* ── Feedback ──────────────────────────────────────────────── */
router.post("/feedback", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const { rating, comment, context, project_id } = req.body as {
    rating?: number; comment?: string; context?: string; project_id?: string;
  };
  if (!rating || rating < 1 || rating > 5) throw badRequest("rating 1-5 required");
  await sql`
    INSERT INTO client_feedback (organization_id, client_id, project_id, rating, comment, context, created_by)
    VALUES (${ctx.organizationId}, ${ctx.clientId}, ${project_id ?? null}, ${rating}, ${comment ?? null}, ${context ?? "general"}, ${ctx.clientUserId})
  `;
  res.status(201).json({ ok: true });
}));

/* ── Profile & Team ────────────────────────────────────────── */
router.get("/profile", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const user = firstRow(await sql`SELECT id, email, name, phone, role FROM client_users WHERE id = ${ctx.clientUserId} LIMIT 1`);
  const client = firstRow(await sql`SELECT name, company, email, phone, website, address, gst_number FROM clients WHERE id = ${ctx.clientId} LIMIT 1`);
  res.json({ user, client, branding: ctx.branding });
}));

router.patch("/profile", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const { name, phone } = req.body as { name?: string; phone?: string };
  await sql`
    UPDATE client_users SET name = COALESCE(${name ?? null}, name), phone = COALESCE(${phone ?? null}, phone), updated_at = now()
    WHERE id = ${ctx.clientUserId}
  `;
  res.json({ ok: true });
}));

router.get("/team", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const rows = (await sql`
    SELECT id, email, name, role, status, last_login_at FROM client_users
    WHERE client_id = ${ctx.clientId} AND organization_id = ${ctx.organizationId}
    ORDER BY created_at ASC
  `) as unknown[];
  res.json({ team: rows });
}));

/* ── AI assistant ──────────────────────────────────────────── */
router.post("/ai/chat", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  const { message, project_id } = req.body as { message?: string; project_id?: string };
  if (!message?.trim()) throw badRequest("Message required");
  const context = await buildClientAiContext(ctx, project_id);
  const result = await answerClientQuestion(message.trim(), context);
  res.json(result);
}));

router.get("/ai/context", asyncHandler(async (req, res) => {
  const ctx = ctxOf(req);
  res.json(await buildClientAiContext(ctx, typeof req.query.project_id === "string" ? req.query.project_id : undefined));
}));

export default router;
