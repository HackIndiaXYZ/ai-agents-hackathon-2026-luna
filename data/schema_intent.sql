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

-- ---------------------------------------------------------------------------
-- Server-side cosine similarity search (used by IntentRetriever RPC path)
-- Run in Supabase SQL Editor if match_intent_examples is missing (PGRST202).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION match_intent_examples(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  utterance text,
  utterance_language text,
  utterance_script text,
  utterance_normalized text,
  intent text,
  intent_category text,
  entities jsonb,
  action jsonb,
  requires_context boolean,
  requires_confirmation boolean,
  is_ambiguous boolean,
  difficulty text,
  source text,
  region text,
  trader_type text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ie.id,
    ie.utterance,
    ie.utterance_language,
    ie.utterance_script,
    ie.utterance_normalized,
    ie.intent,
    ie.intent_category,
    ie.entities,
    ie.action,
    ie.requires_context,
    ie.requires_confirmation,
    ie.is_ambiguous,
    ie.difficulty,
    ie.source,
    ie.region,
    ie.trader_type,
    1 - (ie.utterance_embedding <=> query_embedding) AS similarity
  FROM intent_examples ie
  WHERE ie.utterance_embedding IS NOT NULL
    AND 1 - (ie.utterance_embedding <=> query_embedding) >= match_threshold
  ORDER BY ie.utterance_embedding <=> query_embedding
  LIMIT match_count;
$$;
