-- Deploy server-side vector search for IntentRetriever.
-- Run once in Supabase SQL Editor (fixes PGRST202 on match_intent_examples).
-- Requires: pgvector extension + intent_examples.utterance_embedding vector(384)

CREATE EXTENSION IF NOT EXISTS vector;

-- Function definition also lives in data/schema_intent.sql
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
