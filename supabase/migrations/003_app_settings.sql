-- Global app settings table (single row)
CREATE TABLE app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed with one row
INSERT INTO app_settings (settings) VALUES ('{}');

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed to check authorized users list)
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT TO authenticated USING (true);

-- All authenticated users can update (admin check done in frontend)
CREATE POLICY "Authenticated users can update settings"
  ON app_settings FOR UPDATE TO authenticated USING (true);
