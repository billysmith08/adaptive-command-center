-- ═══════════════════════════════════════════════════════════════════
-- ADAPTIVE BY DESIGN COMMAND CENTER — SUPABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── GLOBAL CONTACTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  company TEXT DEFAULT '',
  position TEXT DEFAULT '',
  department TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  source TEXT DEFAULT 'manual', -- manual, vcard, project
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_global_contacts_user ON global_contacts(user_id);
CREATE INDEX idx_global_contacts_name ON global_contacts(user_id, name);

-- ─── PROJECTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  status TEXT DEFAULT 'Exploration',
  project_type TEXT DEFAULT '',
  is_tour BOOLEAN DEFAULT false,
  location TEXT DEFAULT '',
  why TEXT DEFAULT '',
  budget NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  event_start DATE,
  event_end DATE,
  engagement_start DATE,
  engagement_end DATE,
  notes TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);

-- ─── PROJECT TEAM (producers, managers, staff) ───────────────────
CREATE TABLE IF NOT EXISTS project_team (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- Producer, Manager, Staff / Crew
  contact_id UUID REFERENCES global_contacts(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_team_project ON project_team(project_id);

-- ─── PROJECT CONTACTS (client, poc, billing) ─────────────────────
CREATE TABLE IF NOT EXISTS project_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  role TEXT NOT NULL, -- Client, Point of Contact, Billing, Talent, Artist, Agent, Venue Rep
  department TEXT DEFAULT '',
  contact_id UUID REFERENCES global_contacts(id) ON DELETE SET NULL,
  from_contacts BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_contacts_project ON project_contacts(project_id);

-- ─── SUB-EVENTS (tour dates) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE,
  city TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  status TEXT DEFAULT 'Hold',
  notes TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sub_events_project ON sub_events(project_id);

-- ─── VENDORS / CONTRACTORS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  company TEXT DEFAULT '',
  resource_type TEXT DEFAULT '',
  contact_type TEXT DEFAULT 'Vendor',
  dept_id TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  rate TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  -- Compliance fields stored as JSONB
  compliance JSONB DEFAULT '{"w9":{"done":false,"file":"","date":"","link":""},"coi":{"done":false,"file":"","date":"","link":""},"nda":{"done":false,"file":"","date":"","link":""},"contract":{"done":false,"file":"","date":"","link":""},"onboard":{"done":false,"file":"","date":"","link":""}}'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vendors_project ON vendors(project_id);

-- ─── WORKBACK SCHEDULE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task TEXT DEFAULT '',
  date DATE,
  depts TEXT[] DEFAULT '{}',
  owner TEXT DEFAULT '',
  status TEXT DEFAULT 'Not Started',
  is_event BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workback_project ON workback(project_id);

-- ─── RUN OF SHOW ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS run_of_show (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  day INT NOT NULL DEFAULT 1,
  day_date DATE,
  time TEXT DEFAULT '',
  item TEXT DEFAULT '',
  dept TEXT DEFAULT '',
  vendors TEXT[] DEFAULT '{}',
  location TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  note TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_run_of_show_project ON run_of_show(project_id);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────
ALTER TABLE global_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workback ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_of_show ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
-- Global contacts
CREATE POLICY "Users can manage own contacts" ON global_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Project team (via project ownership)
CREATE POLICY "Users can manage own project team" ON project_team
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Project contacts (via project ownership)
CREATE POLICY "Users can manage own project contacts" ON project_contacts
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Sub events (via project ownership)
CREATE POLICY "Users can manage own sub events" ON sub_events
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Vendors (via project ownership)
CREATE POLICY "Users can manage own vendors" ON vendors
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Workback (via project ownership)
CREATE POLICY "Users can manage own workback" ON workback
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Run of show (via project ownership)
CREATE POLICY "Users can manage own run of show" ON run_of_show
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_global_contacts_updated BEFORE UPDATE ON global_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_project_contacts_updated BEFORE UPDATE ON project_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_vendors_updated BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_workback_updated BEFORE UPDATE ON workback FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_run_of_show_updated BEFORE UPDATE ON run_of_show FOR EACH ROW EXECUTE FUNCTION update_updated_at();
