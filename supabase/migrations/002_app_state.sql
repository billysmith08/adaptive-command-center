-- ADAPTIVE BY DESIGN COMMAND CENTER — AUTO-SAVE TABLE
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

CREATE TABLE IF NOT EXISTS app_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: users can only access their own data
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own state" ON app_state
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_app_state_updated 
  BEFORE UPDATE ON app_state 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
