-- John Elijah Music — full schema. Idempotent: safe to re-run (CREATE IF NOT EXISTS only).
-- Applied by scripts/migrate.ts. Operating spine: bookings → shows. Content spine: releases + photos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────── operators / agents ─────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tokens (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hub_preferences (
  id           INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hub_label    TEXT NOT NULL DEFAULT 'JOHN ELIJAH HQ',
  accent_color TEXT NOT NULL DEFAULT '#D9A441',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────── assets (the photo library) ─────────────────────────

CREATE TABLE IF NOT EXISTS assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_url    TEXT NOT NULL,                  -- web-size (≤2400px) JPEG
  thumb_url   TEXT,                           -- ≤800px JPEG for grids
  source_url  TEXT,                           -- provenance: drive path / original file
  kind        TEXT NOT NULL DEFAULT 'image',  -- image|video
  alt         TEXT NOT NULL DEFAULT '',
  width       INT,
  height      INT,
  credit      TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',   -- 'stage','crowd','portrait','band','hero'
  featured    BOOLEAN NOT NULL DEFAULT false,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  sort_weight INT NOT NULL DEFAULT 100,
  taken_on    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS assets_source_url_key ON assets (source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS assets_public_idx ON assets (is_public, featured, sort_weight);

-- ───────────────────────── rate card (booking configurations) ─────────────────────────

CREATE TABLE IF NOT EXISTS configurations (
  key         TEXT PRIMARY KEY,               -- solo|duo|trio|four_piece|full_band
  label       TEXT NOT NULL,
  lineup      TEXT NOT NULL DEFAULT '',
  base_cents  INT NOT NULL DEFAULT 0,         -- working number for a standard evening
  notes       TEXT NOT NULL DEFAULT '',
  sort        INT NOT NULL DEFAULT 100,
  is_public   BOOLEAN NOT NULL DEFAULT true
);

-- ───────────────────────── bookings (the HQ pipeline) ─────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  contact_name   TEXT NOT NULL,
  contact_email  TEXT NOT NULL,
  contact_phone  TEXT NOT NULL DEFAULT '',
  event_kind     TEXT NOT NULL DEFAULT 'venue',   -- venue|private|wedding|corporate|festival|other
  event_date     DATE,
  start_time     TEXT NOT NULL DEFAULT '',
  hours          NUMERIC(4,1),
  venue_name     TEXT NOT NULL DEFAULT '',
  city           TEXT NOT NULL DEFAULT '',
  configuration  TEXT REFERENCES configurations(key) ON DELETE SET NULL,
  guests         INT,
  budget_cents   INT,
  quote_cents    INT,
  deposit_cents  INT,
  status         TEXT NOT NULL DEFAULT 'inquiry',  -- inquiry|quoted|hold|confirmed|deposit_paid|played|passed|cancelled
  details        TEXT NOT NULL DEFAULT '',         -- what they told us
  notes          TEXT NOT NULL DEFAULT '',         -- what we tell ourselves
  source         TEXT NOT NULL DEFAULT 'site',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (event_date);

CREATE TABLE IF NOT EXISTS booking_events (
  id         SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'note',        -- note|status_change|email|quote
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────── shows (the public calendar) ─────────────────────────

CREATE TABLE IF NOT EXISTS shows (
  id            SERIAL PRIMARY KEY,
  date          DATE NOT NULL,
  start_time    TEXT NOT NULL DEFAULT '',
  end_time      TEXT NOT NULL DEFAULT '',
  venue_name    TEXT NOT NULL,
  city          TEXT NOT NULL DEFAULT '',
  venue_url     TEXT,
  ticket_url    TEXT,
  configuration TEXT REFERENCES configurations(key) ON DELETE SET NULL,
  kind          TEXT NOT NULL DEFAULT 'club',   -- club|festival|private|residency|special
  status        TEXT NOT NULL DEFAULT 'confirmed', -- confirmed|tentative|cancelled
  is_public     BOOLEAN NOT NULL DEFAULT true,
  booking_id    INT REFERENCES bookings(id) ON DELETE SET NULL,
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, venue_name)
);
CREATE INDEX IF NOT EXISTS shows_date_idx ON shows (date, is_public);

-- standing weekly gigs (none seeded — add from HQ when a real one exists)
CREATE TABLE IF NOT EXISTS residencies (
  id         SERIAL PRIMARY KEY,
  venue_name TEXT NOT NULL,
  city       TEXT NOT NULL DEFAULT '',
  venue_url  TEXT,
  weekdays   TEXT[] NOT NULL DEFAULT '{}',    -- 'fri','sat'
  start_time TEXT NOT NULL DEFAULT '',
  label      TEXT NOT NULL DEFAULT '',        -- e.g. 'Weekly'
  active     BOOLEAN NOT NULL DEFAULT true,
  sort       INT NOT NULL DEFAULT 100,
  UNIQUE (venue_name)
);

-- ───────────────────────── music ─────────────────────────

CREATE TABLE IF NOT EXISTS releases (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  kind           TEXT NOT NULL DEFAULT 'album', -- album|ep|single|live
  released_on    DATE,
  cover_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  cover_url      TEXT,                          -- external cover until an asset is mapped
  spotify_id     TEXT,
  apple_url      TEXT,
  youtube_url    TEXT,
  bandcamp_url   TEXT,
  story          TEXT NOT NULL DEFAULT '',
  is_public      BOOLEAN NOT NULL DEFAULT true,
  sort           INT NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS tracks (
  id          SERIAL PRIMARY KEY,
  release_id  INT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  number      INT NOT NULL,
  title       TEXT NOT NULL,
  duration_ms INT,
  spotify_id  TEXT,
  UNIQUE (release_id, number)
);

CREATE TABLE IF NOT EXISTS band_members (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  instrument TEXT NOT NULL DEFAULT '',
  bio        TEXT NOT NULL DEFAULT '',
  hometown   TEXT NOT NULL DEFAULT '',
  asset_id   UUID REFERENCES assets(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort       INT NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS press (
  id           SERIAL PRIMARY KEY,
  outlet       TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  published_on DATE,
  kind         TEXT NOT NULL DEFAULT 'web',   -- web|print|radio|video|listing
  pull_quote   TEXT NOT NULL DEFAULT '',
  is_public    BOOLEAN NOT NULL DEFAULT true,
  sort_weight  INT NOT NULL DEFAULT 100
);
CREATE UNIQUE INDEX IF NOT EXISTS press_url_key ON press (url) WHERE url IS NOT NULL;

-- ───────────────────────── commerce (Stripe + Shippo archetype) ─────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id                SERIAL PRIMARY KEY,
  kind              TEXT NOT NULL DEFAULT 'apparel',  -- apparel|music|accessory
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT NOT NULL DEFAULT '',
  price_cents       INT NOT NULL DEFAULT 0,
  weight_oz         NUMERIC(6,1) NOT NULL DEFAULT 8,  -- for Shippo parcels
  status            TEXT NOT NULL DEFAULT 'draft',    -- draft|live|sold_out|archived
  hero_asset_id     UUID REFERENCES assets(id) ON DELETE SET NULL,
  gallery_asset_ids UUID[] NOT NULL DEFAULT '{}',
  stripe_product_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS variants (
  id              SERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  sku             TEXT,
  inventory       INT NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  sort            INT NOT NULL DEFAULT 100,
  UNIQUE (product_id, label)
);

CREATE TABLE IF NOT EXISTS orders (
  id                    SERIAL PRIMARY KEY,
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  email                 TEXT NOT NULL DEFAULT '',
  name                  TEXT NOT NULL DEFAULT '',
  shipping              JSONB,
  amount_cents          INT NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'paid',  -- paid|fulfilled|refunded
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INT REFERENCES variants(id) ON DELETE SET NULL,
  qty        INT NOT NULL DEFAULT 1,
  unit_cents INT NOT NULL DEFAULT 0
);

-- Shippo labels bought from HQ (one row per label; status mirrors the transaction)
CREATE TABLE IF NOT EXISTS shipments (
  id                    SERIAL PRIMARY KEY,
  order_id              INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shippo_shipment_id    TEXT,
  shippo_rate_id        TEXT,
  shippo_transaction_id TEXT UNIQUE,
  carrier               TEXT NOT NULL DEFAULT '',
  service               TEXT NOT NULL DEFAULT '',
  cost_cents            INT NOT NULL DEFAULT 0,
  tracking_number       TEXT,
  tracking_url          TEXT,
  label_url             TEXT,
  status                TEXT NOT NULL DEFAULT 'created', -- created|purchased|error
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────── audience ─────────────────────────

CREATE TABLE IF NOT EXISTS subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'site',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────── videos (YouTube) ─────────────────────────

CREATE TABLE IF NOT EXISTS videos (
  id          SERIAL PRIMARY KEY,
  youtube_id  TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'live',   -- live|studio|montage|cover|other
  duration    TEXT NOT NULL DEFAULT '',
  featured    BOOLEAN NOT NULL DEFAULT false,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  sort        INT NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────── quote estimator inputs ─────────────────────────

-- travel bands: distance from Port Aransas → flat fee (placeholders until Winston + John set them)
CREATE TABLE IF NOT EXISTS travel_bands (
  key       TEXT PRIMARY KEY,               -- local|coastal_bend|texas|far_texas
  label     TEXT NOT NULL,
  fee_cents INT NOT NULL DEFAULT 0,
  sort      INT NOT NULL DEFAULT 100
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_band    TEXT REFERENCES travel_bands(key) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimate_cents INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_session_id TEXT;

-- ───────────────────────── files (the shared drive: music, video, designs, docs) ─────────────────────────

CREATE TABLE IF NOT EXISTS files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathname     TEXT NOT NULL UNIQUE,            -- blob pathname (folder/filename)
  blob_url     TEXT NOT NULL,
  filename     TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT '',
  kind         TEXT NOT NULL DEFAULT 'other',   -- audio|video|image|design|doc|other
  folder       TEXT NOT NULL DEFAULT 'inbox',   -- music|video|photos|designs|docs|inbox
  uploaded_by  TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS files_folder_idx ON files (folder, created_at DESC);
