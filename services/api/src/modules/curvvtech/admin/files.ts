import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { presignAdminFileUpload, presignFileDownload, s3Configured } from '../../../services/s3Presign.js'
import { organizeFiles } from '../services/fileOrganize.js'
import { emitClientActivity } from '../../shared/activity/emitActivityEvent.js'
import { hasRestrictedProjectScope, isProjectMember } from './staffAccess.js'

const router = Router()
router.use(requireCurvvtechAdmin)

/** Publish a file to the client journal/timeline. Resolves client via file/project. */
async function emitFileShared(
  req: { auth?: { sub?: string; email?: string } },
  fileId: string,
): Promise<void> {
  const file = firstRow<{ name: string; client_id: string | null; project_id: string | null; folder_name: string | null }>(
    await sql`
      SELECT f.name, f.client_id, f.project_id, ff.name AS folder_name
      FROM files f
      LEFT JOIN file_folders ff ON ff.id = f.folder_id
      WHERE f.id = ${fileId}::uuid
    `,
  )
  let clientId = file?.client_id ?? null
  const projectId = file?.project_id ?? null
  if (!clientId && projectId) {
    const proj = firstRow<{ client_id: string | null }>(
      await sql`SELECT client_id FROM projects WHERE id = ${projectId}::uuid`,
    )
    clientId = proj?.client_id ?? null
  }
  if (!clientId) return
  await emitClientActivity(clientId, {
    actorId: req.auth?.sub ?? 'system',
    actorName: req.auth?.email ?? 'Your team',
    projectId,
    eventType: 'file.shared',
    entityType: 'file',
    entityId: fileId,
    title: `Shared a file: ${file?.name ?? 'file'}`,
    body: file?.folder_name ? `Added to ${file.folder_name}` : undefined,
  })
}

/** Folders whose uploads are automatically published to the client portal. */
const AUTO_PUBLISH_FOLDER_KINDS = new Set(['deliverables', 'contracts', 'designs', 'assets'])

async function resolveUploadContext(input: {
  folder_id?: string | null
  client_id?: string | null
  project_id?: string | null
  visibility?: string | null
}): Promise<{ clientId: string | null; organizationId: string | null; shareWithClient: boolean }> {
  let clientId = input.client_id ?? null
  let organizationId: string | null = null
  let projectId = input.project_id ?? null
  let folderKind: string | null = null

  if (input.folder_id) {
    const folder = firstRow<{ folder_kind: string | null; project_id: string | null; client_id: string | null }>(
      await sql`SELECT folder_kind, project_id, client_id FROM file_folders WHERE id = ${input.folder_id}::uuid`,
    )
    folderKind = folder?.folder_kind ?? null
    if (!clientId) clientId = folder?.client_id ?? null
    if (!projectId && folder?.project_id) projectId = folder.project_id
  }

  if (projectId) {
    const proj = firstRow<{ client_id: string | null; organization_id: string | null }>(
      await sql`SELECT client_id, organization_id FROM projects WHERE id = ${projectId}::uuid`,
    )
    if (!clientId) clientId = proj?.client_id ?? null
    organizationId = proj?.organization_id ?? null
  }

  if (!organizationId && clientId) {
    const cl = firstRow<{ organization_id: string | null }>(
      await sql`SELECT organization_id FROM clients WHERE id = ${clientId}::uuid`,
    )
    organizationId = cl?.organization_id ?? null
  }

  const autoPublish = folderKind != null && AUTO_PUBLISH_FOLDER_KINDS.has(folderKind)
  const shareWithClient = input.visibility === 'client' || autoPublish

  return { clientId, organizationId, shareWithClient }
}

const FILE_SELECT = `
  SELECT
    f.*,
    p.name AS project_name,
    c.name AS client_name,
    ff.name AS folder_name,
    u.email AS uploader_email,
    COALESCE(NULLIF(up.display_name, ''), u.email) AS uploader_name
  FROM files f
  LEFT JOIN projects p ON p.id = f.project_id
  LEFT JOIN clients c ON c.id = f.client_id
  LEFT JOIN file_folders ff ON ff.id = f.folder_id
  LEFT JOIN users u ON u.id::text = f.uploaded_by_user_id
  LEFT JOIN user_profiles up ON up.user_id = u.id
`

async function listFiles(whereSql: string, params: unknown[], orderBy: string, limit?: number): Promise<unknown[]> {
  const where = whereSql ? `WHERE ${whereSql}` : ''
  const limitSql = limit ? ` LIMIT ${limit}` : ''
  const r = await pool.query(`${FILE_SELECT} ${where} ORDER BY ${orderBy}${limitSql}`, params)
  return r.rows
}

async function restrictedProjectIds(userId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT project_id::text
    FROM project_members
    WHERE user_id = ${userId}::uuid
  ` as { project_id: string }[]
  return new Set(rows.map((row) => row.project_id))
}

async function requireRestrictedFileAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!hasRestrictedProjectScope(req)) {
    next()
    return
  }
  const file = firstRow<{ project_id: string | null }>(await sql`
    SELECT COALESCE(f.project_id, ff.project_id)::text AS project_id
    FROM files f
    LEFT JOIN file_folders ff ON ff.id = f.folder_id
    WHERE f.id = ${req.params.id}::uuid
  `)
  if (file?.project_id && await isProjectMember(file.project_id, req.auth!.sub)) {
    next()
    return
  }
  res.status(404).json({ error: 'Not found' })
}

async function logFileActivity(
  authSub: string,
  action: string,
  fileId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await sql`
    INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
    VALUES (${authSub}, ${action}, 'file', ${fileId}, ${JSON.stringify(details)}::jsonb)
  `
}

router.get('/summary', async (req, res) => {
  try {
    if (hasRestrictedProjectScope(req)) {
      const row = firstRow<{
        total: number
        storage_bytes: string
        recent_uploads: number
        folders: number
      }>(await sql`
        SELECT
          (SELECT COUNT(*)::int FROM files f
           WHERE EXISTS (
             SELECT 1 FROM project_members pm
             WHERE pm.project_id = f.project_id AND pm.user_id = ${req.auth!.sub}::uuid
           )) AS total,
          (SELECT COALESCE(SUM(f.size_bytes), 0)::bigint FROM files f
           WHERE EXISTS (
             SELECT 1 FROM project_members pm
             WHERE pm.project_id = f.project_id AND pm.user_id = ${req.auth!.sub}::uuid
           )) AS storage_bytes,
          (SELECT COUNT(*)::int FROM files f
           WHERE f."createdAt" >= NOW() - interval '7 days'
             AND EXISTS (
               SELECT 1 FROM project_members pm
               WHERE pm.project_id = f.project_id AND pm.user_id = ${req.auth!.sub}::uuid
             )) AS recent_uploads,
          (SELECT COUNT(*)::int FROM file_folders ff
           WHERE EXISTS (
             SELECT 1 FROM project_members pm
             WHERE pm.project_id = ff.project_id AND pm.user_id = ${req.auth!.sub}::uuid
           )) AS folders
      `)
      res.json({
        total: Number(row?.total ?? 0),
        storage_bytes: Number(row?.storage_bytes ?? 0),
        recent_uploads: Number(row?.recent_uploads ?? 0),
        folders: Number(row?.folders ?? 0),
      })
      return
    }
    const row = firstRow<{
      total: number
      storage_bytes: string
      recent_uploads: number
      folders: number
    }>(await sql`
      SELECT
        (SELECT COUNT(*)::int FROM files) AS total,
        (SELECT COALESCE(SUM(size_bytes), 0)::bigint FROM files) AS storage_bytes,
        (SELECT COUNT(*)::int FROM files WHERE "createdAt" >= NOW() - interval '7 days') AS recent_uploads,
        (SELECT COUNT(*)::int FROM file_folders) AS folders
    `)
    res.json({
      total: Number(row?.total ?? 0),
      storage_bytes: Number(row?.storage_bytes ?? 0),
      recent_uploads: Number(row?.recent_uploads ?? 0),
      folders: Number(row?.folders ?? 0),
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const restricted = hasRestrictedProjectScope(req)
    const rows = await sql`
      SELECT
        al.id::text,
        al.action,
        al.entity_id,
        al.details,
        al."createdAt"::text AS created_at,
        al.clerk_user_id,
        u.email AS actor_email,
        COALESCE(NULLIF(up.display_name, ''), u.email) AS actor_name,
        f.name AS file_name
      FROM activity_logs al
      LEFT JOIN users u ON u.id::text = al.clerk_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN files f ON f.id::text = al.entity_id AND al.entity_type = 'file'
      WHERE (
        al.entity_type = 'file'
        OR al.action IN ('files_organized', 'file_uploaded', 'file_deleted')
      ) AND (
        ${restricted}::boolean = false
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = f.project_id AND pm.user_id = ${req.auth!.sub}::uuid
        )
      )
      ORDER BY al."createdAt" DESC
      LIMIT ${limit}
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/organize', async (req, res) => {
  try {
    if (hasRestrictedProjectScope(req)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Restricted staff cannot organize all files' })
      return
    }
    const auth = req.auth!
    const result = await organizeFiles(auth.sub)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/folders', async (req, res) => {
  try {
    const { parent_id, client_id, project_id } = req.query
    let rows
    if (parent_id) {
      rows = await sql`
        SELECT ff.*,
          (SELECT COUNT(*)::int FROM files WHERE folder_id = ff.id) AS file_count
        FROM file_folders ff
        WHERE ff.parent_id = ${String(parent_id)}::uuid
        ORDER BY ff.name
      `
    } else if (client_id) {
      rows = await sql`
        SELECT ff.*,
          (SELECT COUNT(*)::int FROM files WHERE folder_id = ff.id) AS file_count
        FROM file_folders ff
        WHERE ff.client_id = ${String(client_id)}::uuid AND ff.parent_id IS NULL
        ORDER BY ff.name
      `
    } else if (project_id) {
      rows = await sql`
        SELECT ff.*,
          (SELECT COUNT(*)::int FROM files WHERE folder_id = ff.id) AS file_count
        FROM file_folders ff
        WHERE ff.project_id = ${String(project_id)}::uuid AND ff.parent_id IS NULL
        ORDER BY ff.name
      `
    } else {
      rows = await sql`
        SELECT ff.*,
          (SELECT COUNT(*)::int FROM files WHERE folder_id = ff.id) AS file_count
        FROM file_folders ff
        WHERE ff.parent_id IS NULL
        ORDER BY ff.name
      `
    }
    if (hasRestrictedProjectScope(req)) {
      const allowed = await restrictedProjectIds(req.auth!.sub)
      rows = (rows as { project_id?: string | null }[]).filter(
        (row) => row.project_id && allowed.has(String(row.project_id)),
      )
    }
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/folders', async (req, res) => {
  try {
    const auth = req.auth!
    const { name, parent_id, client_id, project_id } = req.body
    if (
      hasRestrictedProjectScope(req) &&
      (!project_id || !(await isProjectMember(String(project_id), auth.sub)))
    ) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Project membership required' })
      return
    }
    const row = firstRow<{ id: string }>(await sql`
      INSERT INTO file_folders (name, parent_id, client_id, project_id, created_by_user_id)
      VALUES (${name ?? 'Folder'}, ${parent_id ?? null}, ${client_id ?? null}, ${project_id ?? null}, ${auth.sub})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { folder_id, client_id, project_id, recent } = req.query
    let rows: unknown[]
    if (recent === '1') {
      rows = await listFiles('', [], 'f."updatedAt" DESC', 12)
    } else if (folder_id) {
      rows = await listFiles('f.folder_id = $1::uuid', [String(folder_id)], 'f.name ASC')
    } else if (client_id) {
      rows = await listFiles('f.client_id = $1::uuid', [String(client_id)], 'f."updatedAt" DESC')
    } else if (project_id) {
      rows = await listFiles('f.project_id = $1::uuid', [String(project_id)], 'f."updatedAt" DESC')
    } else {
      rows = await listFiles('', [], 'f."updatedAt" DESC', 500)
    }
    if (hasRestrictedProjectScope(req)) {
      const allowed = await restrictedProjectIds(req.auth!.sub)
      rows = rows.filter((row) => {
        const projectId = (row as { project_id?: string | null }).project_id
        return Boolean(projectId && allowed.has(String(projectId)))
      })
    }
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/upload-url', async (req, res) => {
  try {
    if (!s3Configured()) {
      res.status(503).json({ error: 'S3 not configured. Set S3_BUCKET and AWS credentials.' })
      return
    }
    const auth = req.auth!
    const { name, content_type, folder_id, client_id, project_id, size_bytes, visibility } = req.body
    const ctx = await resolveUploadContext({ folder_id, client_id, project_id, visibility })
    if (
      hasRestrictedProjectScope(req) &&
      (!project_id || !(await isProjectMember(String(project_id), auth.sub)))
    ) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Project membership required' })
      return
    }
    const presigned = await presignAdminFileUpload({
      userId: auth.sub,
      fileName: name ?? 'file',
      contentType: content_type ?? 'application/octet-stream',
    })
    if (!presigned) {
      res.status(503).json({ error: 'Could not create upload URL' })
      return
    }
    const row = firstRow<{ id: string; name: string }>(await sql`
      INSERT INTO files (
        name, s3_key, content_type, size_bytes, folder_id, client_id, project_id,
        organization_id, uploaded_by_user_id, visibility, published_at, published_by_user_id
      )
      VALUES (
        ${name ?? 'file'},
        ${presigned.key},
        ${content_type ?? null},
        ${Number(size_bytes ?? 0)},
        ${folder_id ?? null},
        ${ctx.clientId},
        ${project_id ?? null},
        ${ctx.organizationId},
        ${auth.sub},
        ${ctx.shareWithClient ? 'client' : 'internal'},
        ${ctx.shareWithClient ? new Date().toISOString() : null},
        ${ctx.shareWithClient ? auth.sub : null}
      )
      RETURNING *
    `)
    await sql`
      INSERT INTO file_versions (file_id, version, s3_key, size_bytes, uploaded_by_user_id)
      VALUES (${row!.id}, 1, ${presigned.key}, ${Number(size_bytes ?? 0)}, ${auth.sub})
    `
    await logFileActivity(auth.sub, 'file_uploaded', row!.id, { name: row!.name, folder_id, project_id })
    if (ctx.shareWithClient) await emitFileShared(req, row!.id)
    res.json({ file: row, upload: presigned })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.use('/:id', requireRestrictedFileAccess)

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, folder_id, client_id, project_id, visibility } = req.body
    const existing = firstRow<{ id: string; visibility: string | null; project_id: string | null; client_id: string | null; organization_id: string | null; folder_id: string | null }>(
      await sql`SELECT id, visibility, project_id, client_id, organization_id, folder_id FROM files WHERE id = ${id}::uuid`,
    )
    if (!existing) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (name !== undefined) await sql`UPDATE files SET name = ${name}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (folder_id !== undefined) await sql`UPDATE files SET folder_id = ${folder_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (client_id !== undefined) await sql`UPDATE files SET client_id = ${client_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (project_id !== undefined) await sql`UPDATE files SET project_id = ${project_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    const newlyShared = visibility === 'client' && existing.visibility !== 'client'
    if (visibility !== undefined) {
      const ctx = await resolveUploadContext({
        folder_id: folder_id ?? existing.folder_id,
        client_id: client_id ?? existing.client_id,
        project_id: project_id ?? existing.project_id,
        visibility,
      })
      await sql`
        UPDATE files SET
          visibility = ${visibility},
          client_id = COALESCE(${ctx.clientId}, client_id),
          organization_id = COALESCE(${ctx.organizationId}, organization_id),
          published_at = ${visibility === 'client' ? new Date().toISOString() : null},
          published_by_user_id = ${visibility === 'client' ? (req.auth?.sub ?? null) : null},
          "updatedAt" = NOW()
        WHERE id = ${id}::uuid
      `
    }
    if (newlyShared) await emitFileShared(req, id)
    const rows = await listFiles('f.id = $1::uuid', [id], 'f."updatedAt" DESC')
    res.json(rows[0] ?? null)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/versions', async (req, res) => {
  try {
    if (!s3Configured()) {
      res.status(503).json({ error: 'S3 not configured' })
      return
    }
    const auth = req.auth!
    const file = firstRow<{ id: string; name: string; version: number; content_type: string | null }>(
      await sql`SELECT id, name, version, content_type FROM files WHERE id = ${req.params.id}::uuid`,
    )
    if (!file) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const { content_type } = req.body
    const newVersion = Number(file.version ?? 1) + 1
    const presigned = await presignAdminFileUpload({
      userId: auth.sub,
      fileName: String(file.name),
      contentType: content_type ?? 'application/octet-stream',
      version: newVersion,
    })
    if (!presigned) {
      res.status(503).json({ error: 'Could not create upload URL' })
      return
    }
    await sql`
      UPDATE files SET s3_key = ${presigned.key}, version = ${newVersion}, content_type = ${content_type ?? file.content_type}, "updatedAt" = NOW()
      WHERE id = ${req.params.id}::uuid
    `
    await sql`
      INSERT INTO file_versions (file_id, version, s3_key, uploaded_by_user_id)
      VALUES (${req.params.id}::uuid, ${newVersion}, ${presigned.key}, ${auth.sub})
    `
    res.json({ version: newVersion, upload: presigned })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/download-url', async (req, res) => {
  try {
    const file = firstRow<{ s3_key: string; name: string; content_type: string | null }>(
      await sql`SELECT s3_key, name, content_type FROM files WHERE id = ${req.params.id}::uuid`,
    )
    if (!file) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const inline = String(req.query.inline ?? '') === '1' || String(req.query.inline ?? '') === 'true'
    const presigned = await presignFileDownload(file.s3_key, {
      inline,
      contentType: file.content_type,
    })
    if (!presigned) {
      res.status(404).json({ error: 'File missing from storage. Re-upload the file to restore preview/download.' })
      return
    }
    res.json({ ...presigned, name: file.name })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/versions', async (req, res) => {
  try {
    const rows = await sql`
      SELECT fv.*, u.email AS uploader_email,
             COALESCE(NULLIF(up.display_name, ''), u.email) AS uploader_name
      FROM file_versions fv
      LEFT JOIN users u ON u.id::text = fv.uploaded_by_user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE fv.file_id = ${req.params.id}::uuid
      ORDER BY fv.version DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const auth = req.auth!
    const file = firstRow<{ name: string }>(await sql`SELECT name FROM files WHERE id = ${req.params.id}::uuid`)
    await sql`DELETE FROM files WHERE id = ${req.params.id}::uuid`
    if (file?.name) {
      await logFileActivity(auth.sub, 'file_deleted', req.params.id, { name: file.name })
    }
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
