#!/usr/bin/env node
/**
 * Creates the users table in Neon. Run once after setting DATABASE_URL.
 * Usage: DATABASE_URL='postgresql://...' node scripts/init-neon-users.mjs
 * Or with .env.local: node --env-file=.env.local scripts/init-neon-users.mjs (Node 20+)
 */
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL. Set it or use: node --env-file=.env.local scripts/init-neon-users.mjs')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_user_id TEXT NOT NULL UNIQUE,
        email TEXT,
        name TEXT,
        image_url TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users (clerk_user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`
    console.log('Neon users table created (or already exists).')
  } catch (err) {
    console.error('Failed to create table:', err.message)
    process.exit(1)
  }
}

main()
