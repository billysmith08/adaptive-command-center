-- ═══════════════════════════════════════════════════════════════════
-- STATE HISTORY — VERSION CONTROL FOR SHARED STATE
-- ═══════════════════════════════════════════════════════════════════

-- Every save creates a snapshot so you can roll back
CREATE TABLE IF NOT EXISTS shared_state_history (
  id BIGSERIAL PRIMARY KEY,
  state JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT now(),
  saved_by UUID REFERENCES auth.users(id),
  save_reason TEXT DEFAULT 'auto',
  -- Store a summary of what changed for quick browsing
  change_summary TEXT
);

-- Index for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_state_history_saved_at ON shared_state_history(saved_at DESC);

-- RLS: authenticated users can read history, only system can write
ALTER TABLE shared_state_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read state history"
  ON shared_state_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert state history"
  ON shared_state_history FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-snapshot trigger: every update to shared_state saves the OLD state to history
CREATE OR REPLACE FUNCTION snapshot_shared_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shared_state_history (state, saved_by, save_reason, change_summary)
  VALUES (
    OLD.state,
    NEW.updated_by,
    'auto',
    'Auto-snapshot before save at ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  
  -- Keep only the last 200 snapshots to prevent table bloat
  DELETE FROM shared_state_history
  WHERE id NOT IN (
    SELECT id FROM shared_state_history
    ORDER BY saved_at DESC LIMIT 200
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to shared_state
DROP TRIGGER IF EXISTS tr_snapshot_before_save ON shared_state;
CREATE TRIGGER tr_snapshot_before_save
  BEFORE UPDATE ON shared_state
  FOR EACH ROW EXECUTE FUNCTION snapshot_shared_state();

-- ═══════════════════════════════════════════════════════════════════
-- DAILY BACKUP LOG — track when Drive backups were made
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS backup_log (
  id BIGSERIAL PRIMARY KEY,
  backed_up_at TIMESTAMPTZ DEFAULT now(),
  backup_type TEXT DEFAULT 'drive', -- 'drive', 'manual', 'scheduled'
  file_link TEXT,
  file_name TEXT,
  state_size_kb INTEGER,
  status TEXT DEFAULT 'success'
);

ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read backup log"
  ON backup_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert backup log"
  ON backup_log FOR INSERT TO authenticated WITH CHECK (true);
