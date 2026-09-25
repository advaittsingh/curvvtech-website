import { sql, firstRow } from "../../../lib/sqlPool.js";
import type { ClientPortalContext } from "../../client-portal/clientAuth.middleware.js";
import { assertProjectOwnership } from "../projects/projectService.js";
import {
  presignClientFileDownload,
  presignClientFileUpload,
  s3ObjectExists,
} from "../../../services/s3Presign.js";

export type ClientFileDTO = {
  id: string;
  name: string;
  content_type: string | null;
  size_bytes: number;
  version: number;
  project_id: string | null;
  folder_id: string | null;
  folder_name: string | null;
  uploaded_by_client: boolean;
  created_at: string;
};

type FileRow = {
  id: string;
  name: string;
  content_type: string | null;
  size_bytes: number;
  version: number;
  project_id: string | null;
  folder_id: string | null;
  folder_name: string | null;
  uploaded_by_user_id: string | null;
  s3_key: string;
  created_at: string;
};

function toClientFile(row: FileRow): ClientFileDTO {
  return {
    id: row.id,
    name: row.name,
    content_type: row.content_type,
    size_bytes: Number(row.size_bytes ?? 0),
    version: Number(row.version ?? 1),
    project_id: row.project_id,
    folder_id: row.folder_id ?? null,
    folder_name: row.folder_name ?? null,
    uploaded_by_client: String(row.uploaded_by_user_id ?? "").startsWith("client:"),
    created_at: row.created_at,
  };
}

export async function listFilesForClient(
  ctx: ClientPortalContext,
  opts: { projectId?: string } = {},
): Promise<ClientFileDTO[]> {
  let rows: FileRow[];
  if (opts.projectId) {
    if (!(await assertProjectOwnership(ctx, opts.projectId))) return [];
    rows = (await sql`
      SELECT f.id, f.name, f.content_type, f.size_bytes, f.version, f.project_id, f.s3_key,
             f.folder_id, ff.name AS folder_name, f.uploaded_by_user_id,
             f."createdAt" AS created_at
      FROM files f
      LEFT JOIN file_folders ff ON ff.id = f.folder_id
      WHERE f.project_id = ${opts.projectId}
        AND f.client_id = ${ctx.clientId}
        AND f.organization_id = ${ctx.organizationId}
        AND f.visibility = 'client'
      ORDER BY f."createdAt" DESC
    `) as FileRow[];
  } else {
    rows = (await sql`
      SELECT f.id, f.name, f.content_type, f.size_bytes, f.version, f.project_id, f.s3_key,
             f.folder_id, ff.name AS folder_name, f.uploaded_by_user_id,
             f."createdAt" AS created_at
      FROM files f
      LEFT JOIN file_folders ff ON ff.id = f.folder_id
      WHERE f.client_id = ${ctx.clientId}
        AND f.organization_id = ${ctx.organizationId}
        AND f.visibility = 'client'
      ORDER BY f."createdAt" DESC
    `) as FileRow[];
  }
  return rows.map(toClientFile);
}

/**
 * Folders a client is allowed to upload into. These map 1:1 to the admin
 * project folders (same `folder_kind`), so anything a client uploads lands in
 * the exact folder the team already sees in the admin panel.
 */
const CLIENT_UPLOAD_FOLDERS = [
  { kind: "assets", name: "Assets" },
  { kind: "designs", name: "Designs" },
  { kind: "contracts", name: "Contracts" },
  { kind: "deliverables", name: "Deliverables" },
] as const;

const DEFAULT_UPLOAD_KIND = "assets";

/** Find (or lazily create) the project folder for a given kind. */
async function ensureProjectFolder(
  projectId: string,
  kind: string,
  name: string,
  actorId: string,
): Promise<string | null> {
  const existing = firstRow<{ id: string }>(
    await sql`
      SELECT id FROM file_folders
      WHERE project_id = ${projectId}::uuid AND folder_kind = ${kind}
      LIMIT 1
    `,
  );
  if (existing) return existing.id;
  const created = firstRow<{ id: string }>(
    await sql`
      INSERT INTO file_folders (name, project_id, folder_kind, created_by_user_id, "createdAt")
      VALUES (${name}, ${projectId}::uuid, ${kind}, ${actorId}, NOW())
      RETURNING id
    `,
  );
  return created?.id ?? null;
}

export type ClientUploadFolder = { id: string; name: string; kind: string; file_count: number };

/** Ensure the client-uploadable folders exist for a project and return them. */
export async function listUploadFoldersForClient(
  ctx: ClientPortalContext,
  projectId: string,
): Promise<ClientUploadFolder[] | null> {
  if (!(await assertProjectOwnership(ctx, projectId))) return null;
  const actorId = `client:${ctx.clientUserId}`;
  const folders: ClientUploadFolder[] = [];
  for (const f of CLIENT_UPLOAD_FOLDERS) {
    const id = await ensureProjectFolder(projectId, f.kind, f.name, actorId);
    if (!id) continue;
    const count = firstRow<{ n: number }>(
      await sql`SELECT COUNT(*)::int AS n FROM files WHERE folder_id = ${id}::uuid AND visibility = 'client'`,
    );
    folders.push({ id, name: f.name, kind: f.kind, file_count: Number(count?.n ?? 0) });
  }
  return folders;
}

export async function getDownloadUrlForClient(
  ctx: ClientPortalContext,
  fileId: string,
): Promise<{ url: string; expiresIn: number } | null> {
  const row = firstRow<FileRow>(
    await sql`
      SELECT id, s3_key FROM files
      WHERE id = ${fileId}
        AND client_id = ${ctx.clientId}
        AND organization_id = ${ctx.organizationId}
        AND visibility = 'client'
      LIMIT 1
    `,
  );
  if (!row) return null;
  return presignClientFileDownload({ key: row.s3_key, clientId: ctx.clientId, fileId });
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function createClientUpload(
  ctx: ClientPortalContext,
  input: {
    projectId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    folderId?: string;
  },
): Promise<{ fileId: string; url: string; key: string; expiresIn: number } | null> {
  if (input.sizeBytes > MAX_UPLOAD_BYTES) return null;
  if (!(await assertProjectOwnership(ctx, input.projectId))) return null;

  const actorId = `client:${ctx.clientUserId}`;

  // Resolve the target folder. A client-supplied folder must belong to this
  // project; otherwise fall back to the project's default "Assets" folder so the
  // upload always lands in a real admin folder rather than floating loose.
  let folderId: string | null = null;
  if (input.folderId) {
    const owned = firstRow<{ id: string }>(
      await sql`
        SELECT id FROM file_folders
        WHERE id = ${input.folderId}::uuid AND project_id = ${input.projectId}::uuid
        LIMIT 1
      `,
    );
    folderId = owned?.id ?? null;
  }
  if (!folderId) {
    const fallback = CLIENT_UPLOAD_FOLDERS.find((f) => f.kind === DEFAULT_UPLOAD_KIND)!;
    folderId = await ensureProjectFolder(input.projectId, fallback.kind, fallback.name, actorId);
  }

  const presigned = await presignClientFileUpload({
    clientId: ctx.clientId,
    projectId: input.projectId,
    fileName: input.fileName,
    contentType: input.contentType,
  });
  if (!presigned) return null;

  // Client uploads are shared between the client and the team: visibility
  // 'client' means the client sees it in their portal AND the admin panel lists
  // it inside the resolved project folder.
  const row = firstRow<{ id: string }>(
    await sql`
      INSERT INTO files (
        name, s3_key, content_type, size_bytes, version, folder_id,
        uploaded_by_user_id, client_id, project_id, organization_id,
        visibility, published_at, published_by_user_id
      ) VALUES (
        ${input.fileName}, ${presigned.key}, ${input.contentType}, ${input.sizeBytes}, 1, ${folderId}::uuid,
        ${actorId}, ${ctx.clientId}, ${input.projectId}, ${ctx.organizationId},
        'client', NOW(), ${actorId}
      )
      RETURNING id
    `,
  );
  if (!row) return null;

  await sql`
    INSERT INTO file_versions (file_id, version, s3_key, size_bytes, uploaded_by_user_id)
    VALUES (${row.id}::uuid, 1, ${presigned.key}, ${input.sizeBytes}, ${actorId})
  `;

  return { fileId: row.id, url: presigned.url, key: presigned.key, expiresIn: presigned.expiresIn };
}

export async function confirmClientUpload(
  ctx: ClientPortalContext,
  fileId: string,
): Promise<{ id: string; name: string; project_id: string | null; folder_name: string | null } | null> {
  const row = firstRow<{
    id: string;
    name: string;
    project_id: string | null;
    folder_name: string | null;
    s3_key: string;
  }>(
    await sql`
      SELECT f.id, f.name, f.project_id, f.s3_key, ff.name AS folder_name
      FROM files f
      LEFT JOIN file_folders ff ON ff.id = f.folder_id
      WHERE f.id = ${fileId} AND f.client_id = ${ctx.clientId} AND f.organization_id = ${ctx.organizationId}
      LIMIT 1
    `,
  );
  if (!row) return null;
  if (!(await s3ObjectExists(row.s3_key))) {
    await sql`DELETE FROM files WHERE id = ${fileId}::uuid`;
    return null;
  }
  return row;
}

/** Abort a failed client upload by deleting the pending DB row (owned by this client). */
export async function abortClientUpload(
  ctx: ClientPortalContext,
  fileId: string,
): Promise<boolean> {
  const row = firstRow<{ id: string }>(
    await sql`
      DELETE FROM files
      WHERE id = ${fileId}::uuid
        AND client_id = ${ctx.clientId}
        AND organization_id = ${ctx.organizationId}
      RETURNING id
    `,
  );
  return Boolean(row);
}
