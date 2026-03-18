-- ============================================================
-- SocietyOS — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── SOCIETIES ────────────────────────────────────────────────
CREATE TABLE societies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  city        TEXT,
  address     TEXT,
  total_flats INTEGER DEFAULT 0,
  monthly_fee INTEGER DEFAULT 3000,
  balance     BIGINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RESIDENTS ────────────────────────────────────────────────
CREATE TABLE residents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id      UUID REFERENCES societies(id) ON DELETE CASCADE,
  flat            TEXT NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT UNIQUE,
  email           TEXT,
  type            TEXT CHECK (type IN ('owner','tenant')) DEFAULT 'owner',
  block           TEXT,
  members         INTEGER DEFAULT 1,
  vehicle         TEXT,
  since           DATE,
  whatsapp_opt_in BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMITTEE ROLES ──────────────────────────────────────────
CREATE TABLE committee_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id   UUID REFERENCES societies(id) ON DELETE CASCADE,
  resident_id  UUID REFERENCES residents(id),
  role         TEXT CHECK (role IN ('President','Secretary','Treasurer','Committee Member')),
  since        DATE,
  term_end     DATE,
  active       BOOLEAN DEFAULT TRUE
);

-- ── COMPLAINTS ───────────────────────────────────────────────
CREATE TABLE complaints (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id   UUID REFERENCES societies(id) ON DELETE CASCADE,
  flat         TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  priority     TEXT CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  status       TEXT CHECK (status IN ('open','mediating','resolved','ai-mediated')) DEFAULT 'open',
  votes        INTEGER DEFAULT 0,
  source       TEXT DEFAULT 'web',    -- 'web' | 'whatsapp' | 'whatsapp_group'
  raw_message  TEXT,                  -- original WhatsApp message if from group
  ai_suggestion TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

-- ── MAINTENANCE ──────────────────────────────────────────────
CREATE TABLE maintenance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT,
  flat        TEXT,
  priority    TEXT DEFAULT 'medium',
  status      TEXT CHECK (status IN ('open','scheduled','in-progress','completed')) DEFAULT 'open',
  assignee    TEXT DEFAULT 'Unassigned',
  date        DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── FEE COLLECTIONS ──────────────────────────────────────────
CREATE TABLE fee_collections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id   UUID REFERENCES societies(id) ON DELETE CASCADE,
  flat         TEXT NOT NULL,
  resident_id  UUID REFERENCES residents(id),
  amount       INTEGER NOT NULL,
  month        TEXT NOT NULL,         -- '2026-03'
  paid         BOOLEAN DEFAULT FALSE,
  paid_at      TIMESTAMPTZ,
  method       TEXT,                  -- 'UPI'|'Card'|'NetBanking'|'Manual'
  razorpay_id  TEXT,
  receipt_url  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── EXPENSES ─────────────────────────────────────────────────
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  category    TEXT,
  approved    BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  date        DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTICES ──────────────────────────────────────────────────
CREATE TABLE notices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        TEXT DEFAULT 'info',
  author      TEXT,
  pinned      BOOLEAN DEFAULT FALSE,
  sent_whatsapp BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── POLLS ────────────────────────────────────────────────────
CREATE TABLE polls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,         -- ["opt1","opt2","opt3"]
  votes       JSONB DEFAULT '[]',     -- [0,0,0]
  total       INTEGER DEFAULT 0,
  deadline    DATE,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── POLL VOTES (prevent double voting) ───────────────────────
CREATE TABLE poll_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID REFERENCES polls(id),
  resident_id UUID REFERENCES residents(id),
  option_idx  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, resident_id)
);

-- ── STAFF ────────────────────────────────────────────────────
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  shift       TEXT,
  salary      INTEGER,
  phone       TEXT,
  since       DATE,
  status      TEXT DEFAULT 'off-duty',
  rating      DECIMAL(2,1) DEFAULT 5.0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── STAFF ATTENDANCE ─────────────────────────────────────────
CREATE TABLE staff_attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id   UUID REFERENCES staff(id),
  date       DATE DEFAULT CURRENT_DATE,
  status     TEXT CHECK (status IN ('present','absent','leave')),
  marked_by  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- ── VISITORS ─────────────────────────────────────────────────
CREATE TABLE visitors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  flat        TEXT NOT NULL,
  purpose     TEXT,
  type        TEXT DEFAULT 'walkin',  -- 'pre-approved'|'delivery'|'walkin'
  vehicle     TEXT,
  in_time     TIMESTAMPTZ DEFAULT NOW(),
  out_time    TIMESTAMPTZ,
  status      TEXT DEFAULT 'inside',  -- 'inside'|'checked-out'|'expected'
  approved_by TEXT,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── DELIVERIES ───────────────────────────────────────────────
CREATE TABLE deliveries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  flat        TEXT NOT NULL,
  courier     TEXT,
  items       TEXT,
  status      TEXT DEFAULT 'at-gate', -- 'at-gate'|'collected'|'uncollected'
  notified    BOOLEAN DEFAULT FALSE,
  in_time     TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── MEETINGS ─────────────────────────────────────────────────
CREATE TABLE meetings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT DEFAULT 'Committee',
  date        DATE,
  time        TEXT,
  venue       TEXT,
  organiser   TEXT,
  status      TEXT DEFAULT 'upcoming',
  agenda      JSONB DEFAULT '[]',
  rsvp        JSONB DEFAULT '{"yes":0,"no":0,"maybe":0}',
  minutes     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── AMENITY BOOKINGS ─────────────────────────────────────────
CREATE TABLE amenity_bookings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  amenity     TEXT NOT NULL,
  flat        TEXT NOT NULL,
  date        DATE,
  slot        TEXT,
  purpose     TEXT,
  status      TEXT DEFAULT 'confirmed',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(amenity, date, slot)           -- prevents double-booking
);

-- ── CAMPAIGNS ────────────────────────────────────────────────
CREATE TABLE campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id  UUID REFERENCES societies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT,
  date        DATE,
  time        TEXT,
  description TEXT,
  goal        TEXT,
  target      INTEGER DEFAULT 20,
  joined      INTEGER DEFAULT 0,
  points      INTEGER DEFAULT 30,
  status      TEXT DEFAULT 'upcoming',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── CAMPAIGN JOINS ───────────────────────────────────────────
CREATE TABLE campaign_joins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  resident_id UUID REFERENCES residents(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, resident_id)
);

-- ── VOLUNTEERS ───────────────────────────────────────────────
CREATE TABLE volunteers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id      UUID REFERENCES societies(id) ON DELETE CASCADE,
  resident_id     UUID REFERENCES residents(id),
  block           TEXT,
  hero_points     INTEGER DEFAULT 0,
  streak          INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  badges          JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── VOLUNTEER TASKS ──────────────────────────────────────────
CREATE TABLE volunteer_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_id UUID REFERENCES volunteers(id),
  task         TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',  -- 'pending'|'completed'
  points       INTEGER DEFAULT 25,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── APPRECIATIONS ────────────────────────────────────────────
CREATE TABLE appreciations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id   UUID REFERENCES societies(id) ON DELETE CASCADE,
  from_flat    TEXT,
  from_name    TEXT,
  to_volunteer UUID REFERENCES volunteers(id),
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  by_name    TEXT,
  by_role    TEXT,
  flat       TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WHATSAPP MESSAGE LOG ─────────────────────────────────────
CREATE TABLE whatsapp_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  to_flat    TEXT,
  to_number  TEXT,
  message    TEXT,
  type       TEXT,
  status     TEXT DEFAULT 'pending',  -- 'pending'|'delivered'|'read'|'failed'
  wa_msg_id  TEXT,
  source     TEXT DEFAULT 'system',   -- 'system'|'group'|'bot'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── GROUP MESSAGE LOG (for AI analysis) ──────────────────────
CREATE TABLE group_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id   UUID REFERENCES societies(id) ON DELETE CASCADE,
  wa_msg_id    TEXT,
  from_number  TEXT,
  from_name    TEXT,
  flat         TEXT,
  message_text TEXT,
  message_type TEXT DEFAULT 'text',   -- 'text'|'audio'|'image'
  audio_url    TEXT,
  transcription TEXT,
  language     TEXT,
  intent       TEXT,                  -- 'complaint'|'appreciation'|'conflict'|'info'|'emergency'
  processed    BOOLEAN DEFAULT FALSE,
  ticket_id    UUID,                  -- if complaint was auto-created
  sentiment    TEXT,                  -- 'positive'|'neutral'|'negative'|'escalating'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── HARMONY SCORES (computed nightly) ────────────────────────
CREATE TABLE harmony_scores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id  UUID REFERENCES residents(id),
  score        INTEGER DEFAULT 100,
  payment_pts  INTEGER DEFAULT 40,
  respect_pts  INTEGER DEFAULT 30,
  civic_pts    INTEGER DEFAULT 30,
  computed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE societies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_collections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages    ENABLE ROW LEVEL SECURITY;

-- Public read for notices and polls (all residents of a society can read)
CREATE POLICY "residents_read_notices"
  ON notices FOR SELECT USING (true);

CREATE POLICY "residents_read_polls"
  ON polls FOR SELECT USING (true);

-- Residents can insert complaints
CREATE POLICY "residents_insert_complaints"
  ON complaints FOR INSERT WITH CHECK (true);

CREATE POLICY "residents_read_complaints"
  ON complaints FOR SELECT USING (true);

-- Service role (your Edge Functions) can do everything
-- This is the default — service_role key bypasses RLS

-- ============================================================
-- SEED: ONE DEMO SOCIETY
-- ============================================================
INSERT INTO societies (id, name, city, total_flats, monthly_fee, balance)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Sunrise Residency',
  'Hyderabad',
  10,
  3000,
  284500
);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Monthly collection summary
CREATE VIEW monthly_collection_summary AS
SELECT
  society_id,
  month,
  COUNT(*) FILTER (WHERE paid = TRUE)  AS paid_count,
  COUNT(*) FILTER (WHERE paid = FALSE) AS unpaid_count,
  SUM(amount) FILTER (WHERE paid = TRUE) AS total_collected
FROM fee_collections
GROUP BY society_id, month;

-- Harmony score view (computed dynamically)
CREATE VIEW resident_harmony AS
SELECT
  r.id,
  r.flat,
  r.name,
  r.society_id,
  GREATEST(0, LEAST(100,
    40 - (COALESCE(fc_defaults.defaults, 0) * 8)
    + 30 - (COALESCE(comp_against.count, 0) * 15)
    + 30
  )) AS harmony_score
FROM residents r
LEFT JOIN (
  SELECT resident_id, COUNT(*) AS defaults
  FROM fee_collections WHERE paid = FALSE
  GROUP BY resident_id
) fc_defaults ON fc_defaults.resident_id = r.id
LEFT JOIN (
  SELECT flat, COUNT(*) AS count
  FROM complaints WHERE status != 'resolved'
  GROUP BY flat
) comp_against ON comp_against.flat = r.flat;
