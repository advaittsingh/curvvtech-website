import { pool } from '../../../db.js'
import { firstRow, sql } from '../../../lib/sqlPool.js'

const CATEGORY_FOLDERS = [
  'Clients',
  'Projects',
  'Contracts',
  'Invoices',
  'Proposals',
  'Internal',
  'Brand Assets',
] as const

type Category = (typeof CATEGORY_FOLDERS)[number]

function categorizeFileName(name: string): Category | null {
  const n = name.toLowerCase()
  if (/invoice|receipt|bill|payment/.test(n)) return 'Invoices'
  if (/proposal|quote|scope|pitch/.test(n)) return 'Proposals'
  if (/contract|agreement|nda|msa|sow/.test(n)) return 'Contracts'
  if (/logo|brand|font|guideline|styleguide/.test(n) || /\.(ai|svg|eps)$/i.test(n)) return 'Brand Assets'
  if (/internal|ops|sop|hr|policy/.test(n)) return 'Internal'
  return null
}

async function ensureFolder(name: string, authSub: string): Promise<string> {
  const existing = firstRow<{ id: string }>(
    await sql`
      SELECT id::text FROM file_folders
      WHERE name = ${name} AND parent_id IS NULL
      LIMIT 1
    `,
  )
  if (existing?.id) return existing.id

  const row = firstRow<{ id: string }>(
    await sql`
      INSERT INTO file_folders (name, parent_id, created_by_user_id)
      VALUES (${name}, NULL, ${authSub})
      RETURNING id::text AS id
    `,
  )
  return row!.id
}

export async function organizeFiles(authSub: string): Promise<{ moved: number; details: string[] }> {
  const files = (await pool.query(
    `SELECT id::text, name, project_id::text, client_id::text, folder_id::text
     FROM files ORDER BY "updatedAt" DESC LIMIT 500`,
  ).then((r) => r.rows)) as {
    id: string
    name: string
    project_id: string | null
    client_id: string | null
    folder_id: string | null
  }[]

  const projects = (await pool.query(`SELECT id::text, name FROM projects`).then((r) => r.rows)) as {
    id: string
    name: string
  }[]

  const folderIds = new Map<Category, string>()
  for (const cat of CATEGORY_FOLDERS) {
    folderIds.set(cat, await ensureFolder(cat, authSub))
  }

  const details: string[] = []
  let moved = 0

  for (const file of files) {
    let targetFolder: Category | null = null
    let projectId = file.project_id

    for (const p of projects) {
      if (p.name && file.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 8))) {
        targetFolder = 'Projects'
        projectId = projectId ?? p.id
        break
      }
    }

    if (!targetFolder) targetFolder = categorizeFileName(file.name)
    if (!targetFolder && file.client_id) targetFolder = 'Clients'
    if (!targetFolder && file.project_id) targetFolder = 'Projects'
    if (!targetFolder) continue

    const folderId = folderIds.get(targetFolder)!
    if (file.folder_id === folderId && file.project_id === projectId) continue

    await sql`
      UPDATE files SET
        folder_id = ${folderId}::uuid,
        project_id = COALESCE(${projectId ?? null}::uuid, project_id),
        "updatedAt" = NOW()
      WHERE id = ${file.id}::uuid
    `
    moved++
    details.push(`${file.name} → ${targetFolder}`)
  }

  if (moved > 0) {
    await sql`
      INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
      VALUES (
        ${authSub},
        'files_organized',
        'files',
        'bulk',
        ${JSON.stringify({ moved, sample: details.slice(0, 5) })}::jsonb
      )
    `
  }

  return { moved, details: details.slice(0, 20) }
}
