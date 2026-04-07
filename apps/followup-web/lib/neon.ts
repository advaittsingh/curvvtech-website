import { neon } from '@neondatabase/serverless'

export function getConnectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  )
}

let sql: ReturnType<typeof neon> | null = null

export function getSql() {
  const connectionString = getConnectionString()
  if (!connectionString) {
    const err = new Error('MISSING_DATABASE_ENV')
    err.name = 'MissingDatabaseEnv'
    throw err
  }
  if (!sql) {
    sql = neon(connectionString)
  }
  return sql
}
