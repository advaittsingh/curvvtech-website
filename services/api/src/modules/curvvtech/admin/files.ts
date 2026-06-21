import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { presignAdminFileUpload, presignFileDownload, s3Configured } from '../../../services/s3Presign.js'
import { organizeFiles } from '../services/fileOrganize.js'

const router = Router()
router.use(requireCurvvtechAdmin)

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

router.get('/summary', async (_req, res) => {
  try {
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
      WHERE al.entity_type = 'file'
         OR al.action IN ('files_organized', 'file_uploaded', 'file_deleted')
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
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/folders', async (req, res) => {
  try {
    const auth = req.auth!
    const { name, parent_id, client_id, project_id } = req.body
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
    const { name, content_type, folder_id, client_id, project_id, size_bytes } = req.body
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
      INSERT INTO files (name, s3_key, content_type, size_bytes, folder_id, client_id, project_id, uploaded_by_user_id)
      VALUES (
        ${name ?? 'file'},
        ${presigned.key},
        ${content_type ?? null},
        ${Number(size_bytes ?? 0)},
        ${folder_id ?? null},
        ${client_id ?? null},
        ${project_id ?? null},
        ${auth.sub}
      )
      RETURNING *
    `)
    await sql`
      INSERT INTO file_versions (file_id, version, s3_key, size_bytes, uploaded_by_user_id)
      VALUES (${row!.id}, 1, ${presigned.key}, ${Number(size_bytes ?? 0)}, ${auth.sub})
    `
    await logFileActivity(auth.sub, 'file_uploaded', row!.id, { name: row!.name, folder_id, project_id })
    res.json({ file: row, upload: presigned })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, folder_id, client_id, project_id } = req.body
    const existing = firstRow(await sql`SELECT id FROM files WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (name !== undefined) await sql`UPDATE files SET name = ${name}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (folder_id !== undefined) await sql`UPDATE files SET folder_id = ${folder_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (client_id !== undefined) await sql`UPDATE files SET client_id = ${client_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (project_id !== undefined) await sql`UPDATE files SET project_id = ${project_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
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
    const file = firstRow<{ s3_key: string; name: string }>(
      await sql`SELECT s3_key, name FROM files WHERE id = ${req.params.id}::uuid`,
    )
    if (!file) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const presigned = await presignFileDownload(file.s3_key)
    if (!presigned) {
      res.status(503).json({ error: 'Download not available' })
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
