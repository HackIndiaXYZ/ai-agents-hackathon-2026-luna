-- ============================================================
-- TradeNexus CTRM Schema Extension
-- data/schema_ctrm.sql
--
-- IMPORTANT: This file ONLY adds new tables and new columns.
-- It does NOT drop or modify any existing table structures.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ────────────────────────────────────────────────────────────
-- Alterations to existing tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE commodity_aliases
  ADD COLUMN IF NOT EXISTS embedding vector(384);

ALTER TABLE feedback_events
  ADD COLUMN IF NOT EXISTS resolution_tier TEXT;

-- ────────────────────────────────────────────────────────────
-- 1. counterparties
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS counterparties (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('buyer','seller','both')),
  gstin                 TEXT,
  pan                   TEXT,
  city                  TEXT NOT NULL,
  state                 TEXT NOT NULL,
  contact_name          TEXT,
  contact_phone         TEXT,
  credit_limit          NUMERIC(12,2) DEFAULT 0,
  payment_history_score FLOAT DEFAULT 0.8,
  total_trades          INTEGER DEFAULT 0,
  on_time_deliveries    INTEGER DEFAULT 0,
  late_deliveries       INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. contracts
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number     TEXT UNIQUE NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('buy','sell')),
  commodity_id        UUID REFERENCES commodities(id),
  counterparty_id     UUID REFERENCES counterparties(id),
  quantity            NUMERIC(10,2) NOT NULL,
  unit                TEXT DEFAULT 'quintal',
  price_per_unit      NUMERIC(10,2),
  price_type          TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed','formula')),
  formula_basis       TEXT CHECK (formula_basis IN ('mandi_modal','spot')),
  formula_premium_pct FLOAT DEFAULT 0,
  contract_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date       DATE,
  delivery_location   TEXT,
  status              TEXT DEFAULT 'draft' CHECK (status IN
    ('draft','confirmed','in_transit','delivered','settled','cancelled')),
  payment_terms       TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. dispatches
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dispatches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number     TEXT UNIQUE NOT NULL,
  contract_id         UUID REFERENCES contracts(id),
  dispatched_quantity NUMERIC(10,2) NOT NULL,
  dispatch_date       DATE NOT NULL,
  vehicle_number      TEXT,
  driver_contact      TEXT,
  origin              TEXT NOT NULL,
  destination         TEXT NOT NULL,
  corridor_id         UUID REFERENCES trade_corridors(id),
  estimated_arrival   DATE,
  actual_arrival      DATE,
  status              TEXT DEFAULT 'scheduled' CHECK (status IN
    ('scheduled','in_transit','delivered','delayed','cancelled')),
  delay_hours         FLOAT,
  delay_reason        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. pnl_snapshots
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pnl_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID REFERENCES contracts(id),
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_price  NUMERIC(10,2) NOT NULL,
  market_price    NUMERIC(10,2) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL,
  unrealized_pnl  NUMERIC(12,2) NOT NULL,
  pnl_pct         FLOAT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contract_id, snapshot_date)
);

-- ────────────────────────────────────────────────────────────
-- 5. quality_lots
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_lots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id          UUID REFERENCES contracts(id),
  commodity_id         UUID REFERENCES commodities(id),
  quantity             NUMERIC(10,2) NOT NULL,
  unit                 TEXT DEFAULT 'quintal',
  moisture_pct         FLOAT,
  grade                TEXT,
  foreign_matter_pct   FLOAT,
  broken_grains_pct    FLOAT,
  origin_location      TEXT,
  origin_lat           NUMERIC(9,6),
  origin_lng           NUMERIC(9,6),
  price_adjustment_pct FLOAT DEFAULT 0,
  field_agent_note     TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. macro_signals
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS macro_signals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id       UUID REFERENCES commodities(id),
  signal_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  signal_type        TEXT NOT NULL CHECK (signal_type IN
    ('weather_risk','sentiment','policy','tariff')),
  sentiment          TEXT CHECK (sentiment IN ('bullish','bearish','neutral')),
  confidence         FLOAT,
  urgency            TEXT CHECK (urgency IN ('immediate','this_week','this_month')),
  key_signal         TEXT NOT NULL,
  price_impact       TEXT CHECK (price_impact IN ('upward','downward','neutral')),
  affected_contracts INTEGER DEFAULT 0,
  raw_data           JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 7. agent_activity_log
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_activity_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name         TEXT NOT NULL,
  action_type        TEXT NOT NULL,
  summary            TEXT NOT NULL,
  detail             JSONB,
  contracts_affected INTEGER DEFAULT 0,
  duration_ms        INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_status_date
  ON contracts (status, contract_date DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_commodity_created
  ON contracts (commodity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_counterparty_created
  ON contracts (counterparty_id, created_at DESC);

-- pnl_snapshots
CREATE INDEX IF NOT EXISTS idx_pnl_snapshots_date
  ON pnl_snapshots (snapshot_date DESC);

-- macro_signals
CREATE INDEX IF NOT EXISTS idx_macro_signals_date_commodity
  ON macro_signals (signal_date DESC, commodity_id);

-- agent_activity_log
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created
  ON agent_activity_log (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- Functions: auto-incrementing number generators
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT := TO_CHAR(NOW(), 'YYYY');
  seq  INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM contracts
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  RETURN 'TN-' || year || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_dispatch_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT := TO_CHAR(NOW(), 'YYYY');
  seq  INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM dispatches
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  RETURN 'TND-' || year || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Run this in Supabase SQL Editor after existing schema
-- Safe to run multiple times (uses IF NOT EXISTS)
