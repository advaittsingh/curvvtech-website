-- Migrate existing "User" table to "users" and add columns for Clerk webhook.
-- Run in Neon Console → SQL Editor (same project as Vercel DATABASE_URL).

-- 1. Rename table (quotes preserve case in PostgreSQL)
ALTER TABLE "User" RENAME TO users;

-- 2. Rename id column to clerk_user_id (your existing ids are already Clerk-like)
ALTER TABLE users RENAME COLUMN id TO clerk_user_id;

-- 3. Add columns the Clerk webhook uses
ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Backfill created_at/updated_at for existing rows
UPDATE users SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW()) WHERE created_at IS NULL OR updated_at IS NULL;

-- 5. Index for webhook lookups (clerk_user_id is already PK, this helps email lookups)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
