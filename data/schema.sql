-- =============================================================================
-- TradeNexus — Supabase Schema
--
-- Single-file schema for Supabase SQL Editor. Run once to bootstrap.
-- Enables pgvector (384-dim embeddings) and pg_trgm (trigram fuzzy search).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. commodities — Canonical commodity master list
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS commodities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name  TEXT NOT NULL UNIQUE,
    category        TEXT NOT NULL,              -- Fibre|Pulse|Cereal|Oilseed|Spice|Vegetable
    unit_of_measure TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. commodity_aliases — Regional / multilingual name variants + embeddings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS commodity_aliases (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id     UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    alias_text       TEXT NOT NULL,
    language         TEXT NOT NULL,             -- hi|mr|gu|te|ta|pa|bn|kn|en
    region           TEXT,
    source           TEXT DEFAULT 'seed',       -- seed|user|adaptive_data|llm_inferred
    confidence_score FLOAT DEFAULT 0.8,
    embedding        vector(384),               -- paraphrase-multilingual-MiniLM-L12-v2
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_alias UNIQUE (alias_text, language, commodity_id)
);

-- Trigram index for Tier-2 fuzzy matching
CREATE INDEX IF NOT EXISTS idx_alias_text_trgm
    ON commodity_aliases USING gin(alias_text gin_trgm_ops);

-- IVFFlat index for Tier-3 vector cosine search
-- Note: IVFFlat requires rows to already exist; rebuild after bulk inserts.
CREATE INDEX IF NOT EXISTS idx_alias_embedding_ivfflat
    ON commodity_aliases USING ivfflat(embedding vector_cosine_ops)
    WITH (lists = 50);

-- ---------------------------------------------------------------------------
-- 3. mandi_prices — Daily market price observations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mandi_prices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id   UUID REFERENCES commodities(id),
    mandi_name     TEXT NOT NULL,
    state          TEXT NOT NULL,
    min_price      NUMERIC(10,2),
    max_price      NUMERIC(10,2),
    modal_price    NUMERIC(10,2) NOT NULL,
    unit           TEXT NOT NULL,
    data_as_of     DATE NOT NULL,
    recorded_at    TIMESTAMPTZ DEFAULT NOW(),
    source         TEXT DEFAULT 'data.gov.in',
    is_anomaly     BOOLEAN DEFAULT FALSE,
    anomaly_score  FLOAT                       -- how many std deviations from mean
);

CREATE INDEX IF NOT EXISTS idx_mandi_commodity_date
    ON mandi_prices (commodity_id, data_as_of DESC);

CREATE INDEX IF NOT EXISTS idx_mandi_state_date
    ON mandi_prices (state, data_as_of DESC);

-- ---------------------------------------------------------------------------
-- 4. market_alerts — Automated price / demand alerts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS market_alerts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id     UUID REFERENCES commodities(id),
    alert_type       TEXT NOT NULL,             -- demand_spike|price_drop|opportunity
    mandi_name       TEXT NOT NULL,
    state            TEXT NOT NULL,
    message          TEXT NOT NULL,
    confidence_score FLOAT,
    price_delta_pct  FLOAT,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. trade_corridors — Major inter-state transport routes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trade_corridors (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_region          TEXT NOT NULL,
    destination_region     TEXT NOT NULL,
    origin_state           TEXT NOT NULL,
    destination_state      TEXT NOT NULL,
    distance_km            INTEGER,
    typical_duration_hours FLOAT,
    reliability_score      FLOAT DEFAULT 0.7,
    last_updated           TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. corridor_reports — Delay / disruption reports per corridor
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS corridor_reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corridor_id  UUID REFERENCES trade_corridors(id),
    delay_hours  FLOAT,
    reason       TEXT,
    reported_at  TIMESTAMPTZ DEFAULT NOW(),
    season       TEXT                           -- kharif|rabi|summer
);

-- ---------------------------------------------------------------------------
-- 7. trade_opportunities — Open trade / return-load listings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trade_opportunities (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id   UUID REFERENCES commodities(id),
    origin         TEXT NOT NULL,
    destination    TEXT NOT NULL,
    quantity       NUMERIC(10,2),
    unit           TEXT,
    available_from DATE,
    is_return_load BOOLEAN DEFAULT FALSE,
    contact_info   TEXT,
    status         TEXT DEFAULT 'open',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. feedback_events — Append-only event log for Adaptive Data pipeline
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feedback_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      TEXT NOT NULL,
        -- alias_resolution|alias_correction|alert_feedback|route_report
    entity_type     TEXT,
    entity_id       UUID,
    original_value  TEXT,
    corrected_value TEXT,
    language        TEXT,
    resolution_tier TEXT,                       -- exact|trigram|embedding|llm|unknown
    is_positive     BOOLEAN,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9. user_inventory — Demo user commodity stock levels
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_inventory (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    quantity     NUMERIC(10,2) NOT NULL,
    unit         TEXT DEFAULT 'quintal',
    notes        TEXT,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_inventory_commodity UNIQUE (commodity_id)
);

-- ---------------------------------------------------------------------------
-- 10. buyers — Seeded buyer network (TradeNexus Buyer Network Beta)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS buyers (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                     TEXT NOT NULL,
    type                     TEXT NOT NULL,           -- cotton_mill|dal_mill|food_processor|exporter|retailer
    city                     TEXT NOT NULL,
    state                    TEXT NOT NULL,
    lat                      NUMERIC(9,6),
    lng                      NUMERIC(9,6),
    commodities_needed       TEXT[],                  -- array of canonical commodity names
    typical_volume_quintals  INTEGER,
    contact_placeholder      TEXT DEFAULT 'Contact via TradeNexus',
    verified                 BOOLEAN DEFAULT FALSE,
    created_at               TIMESTAMPTZ DEFAULT NOW()
);
