import type { NextFunction, Request, Response } from "express";
import { firstRow, sql } from "../../../lib/sqlPool.js";
import { isRestrictedProjectRole } from "../../../lib/adminPermissions.js";

export function hasRestrictedProjectScope(req: Request): boolean {
  return isRestrictedProjectRole(req.adminRole);
}

export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const row = firstRow(await sql`
    SELECT 1
    FROM project_members
    WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `);
  return Boolean(row);
}

/** Return 404 for inaccessible projects so restricted staff cannot enumerate IDs. */
export async function requireProjectMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!hasRestrictedProjectScope(req)) {
    next();
    return;
  }
  if (await isProjectMember(String(req.params.id), req.auth!.sub)) {
    next();
    return;
  }
  res.status(404).json({ error: "Project not found" });
}
