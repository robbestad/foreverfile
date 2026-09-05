CREATE TABLE IF NOT EXISTS foreverfile_records (
  id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{43}$'),
  record jsonb,
  registered_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  CHECK (record IS NULL OR (record->>'id' = id AND record->>'appName' = 'foreverfile'))
);
CREATE INDEX IF NOT EXISTS foreverfile_records_recent
  ON foreverfile_records (registered_at DESC, id DESC) WHERE record IS NOT NULL;
CREATE INDEX IF NOT EXISTS foreverfile_records_pending
  ON foreverfile_records (checked_at) WHERE record IS NULL OR record->>'timestamp' IS NULL;
