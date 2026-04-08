-- Curvvtech admin + unified DB: role column on follow-up users (JWT admins).

ALTER TABLE users ADD COLUMN IF NOT EXISTS curvvtech_role TEXT;

COMMENT ON COLUMN users.curvvtech_role IS 'Curvvtech dashboard: admin | manager | member (null = no dashboard access)';

CREATE INDEX IF NOT EXISTS idx_users_curvvtech_role ON users (curvvtech_role)
  WHERE curvvtech_role IS NOT NULL;
