-- Admin panel notification read state (bell dropdown).

CREATE TABLE IF NOT EXISTS staff_notification_reads (
  user_id           TEXT NOT NULL,
  notification_key  TEXT NOT NULL,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_staff_notification_reads_user
  ON staff_notification_reads (user_id, read_at DESC);
