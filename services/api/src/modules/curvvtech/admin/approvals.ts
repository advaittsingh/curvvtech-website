import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler.js";
import { badRequest } from "../../../lib/errors.js";
import {
  createApprovalRequest,
  deleteApprovalRequest,
  listApprovalRequests,
  resolveApprovalContext,
} from "../services/approvalRequests.js";
import { sql, firstRow } from "../../../lib/sqlPool.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = req.query.project_id ? String(req.query.project_id) : undefined;
    const clientId = req.query.client_id ? String(req.query.client_id) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    if (!projectId && !clientId) throw badRequest("project_id or client_id is required");
    const rows = await listApprovalRequests({ projectId, clientId, status });
    res.json({ approvals: rows });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as {
      project_id?: string;
      client_id?: string;
      entity_type?: string;
      entity_id?: string;
      title?: string;
      description?: string;
      review_url?: string;
    };
    const ctx = await resolveApprovalContext(body.project_id, body.client_id);

    const row = await createApprovalRequest({
      organizationId: ctx.organizationId,
      clientId: ctx.clientId,
      projectId: ctx.projectId,
      entityType: body.entity_type ?? "other",
      entityId: body.entity_id,
      title: String(body.title ?? ""),
      description: body.description,
      reviewUrl: body.review_url,
      createdBy: req.auth?.sub ?? null,
      createdByName: req.auth?.email ?? "Team",
    });
    res.status(201).json({ approval: row });
  }),
);

router.delete(
  "/:approvalId",
  asyncHandler(async (req, res) => {
    const approvalId = String(req.params.approvalId);
    const row = firstRow<{ organization_id: string; status: string }>(
      await sql`SELECT organization_id, status FROM approval_requests WHERE id = ${approvalId}::uuid LIMIT 1`,
    );
    if (!row) {
      res.status(404).json({ error: "Approval request not found" });
      return;
    }
    const ok = await deleteApprovalRequest(row.organization_id, approvalId);
    if (!ok) {
      res.status(404).json({ error: "Approval request not found" });
      return;
    }
    res.status(204).end();
  }),
);

export default router;
