-- ═══════════════════════════════════════════════════════════════════
-- MIGRATE TO SHARED DATABASE — ALL USERS SEE SAME DATA
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create new shared_state table (single row for everyone)
CREATE TABLE IF NOT EXISTS shared_state (
  id TEXT PRIMARY KEY DEFAULT 'shared',
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed with one row
INSERT INTO shared_state (id, state) VALUES ('shared', '{}')
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: all authenticated users can read and write
ALTER TABLE shared_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read shared state"
  ON shared_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can update shared state"
  ON shared_state FOR UPDATE TO authenticated USING (true);

-- 3. Copy data from the first user's app_state into shared_state
-- (so we don't lose existing data)
UPDATE shared_state
SET state = (SELECT state FROM app_state ORDER BY updated_at DESC LIMIT 1),
    updated_at = now()
WHERE id = 'shared'
AND EXISTS (SELECT 1 FROM app_state LIMIT 1);

-- 4. Trigger for updated_at
CREATE TRIGGER tr_shared_state_updated
  BEFORE UPDATE ON shared_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
