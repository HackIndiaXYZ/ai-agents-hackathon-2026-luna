-- ============================================================
-- TradeNexus — Intent Examples Schema
-- data/schema_intent.sql
--
-- Schema for storing and querying multilingual commodity trading intents.
-- Run this in the Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS intent_examples (
  id TEXT PRIMARY KEY,
  utterance TEXT NOT NULL,
  utterance_language TEXT NOT NULL DEFAULT 'en',
  utterance_script TEXT DEFAULT 'latin',
  utterance_normalized TEXT,
  intent TEXT NOT NULL,
  intent_category TEXT NOT NULL,
  entities JSONB NOT NULL DEFAULT '{}',
  action JSONB NOT NULL DEFAULT '{}',
  expected_response_template TEXT,
  requires_context BOOLEAN DEFAULT FALSE,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  is_ambiguous BOOLEAN DEFAULT FALSE,
  difficulty TEXT DEFAULT 'simple',
  source TEXT DEFAULT 'seed_english',
  region TEXT DEFAULT 'pan_india',
  trader_type TEXT DEFAULT 'general',
  utterance_embedding vector(384),
  language_family TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_examples_intent 
  ON intent_examples(intent);
CREATE INDEX IF NOT EXISTS idx_intent_examples_category 
  ON intent_examples(intent_category);
CREATE INDEX IF NOT EXISTS idx_intent_examples_language 
  ON intent_examples(utterance_language);
CREATE INDEX IF NOT EXISTS idx_intent_embedding 
  ON intent_examples 
  USING ivfflat (utterance_embedding vector_cosine_ops)
  WITH (lists = 100);
