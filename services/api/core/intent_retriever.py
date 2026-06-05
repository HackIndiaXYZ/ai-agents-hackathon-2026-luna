"""
TradeNexus API — Intent RAG Retrieval Layer.

Matches user trading queries against the multilingual intent_examples database
to inject relevant few-shot examples into the LLM classifier.
"""

from __future__ import annotations

import re
import json
import logging
from collections import Counter
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import numpy as np

logger = logging.getLogger("intent_retriever")
logger.setLevel(logging.INFO)


class RetrievedExample(BaseModel):
    utterance: str
    intent: str
    intent_category: str
    entities: Dict[str, Any] = {}
    action: Dict[str, Any] = {}
    similarity: float
    language: str


class RetrievalResult(BaseModel):
    examples: List[RetrievedExample]
    retrieval_confidence: float
    dominant_intent: Optional[str] = None
    dominant_category: Optional[str] = None
    retrieval_used: bool


class IntentRetriever:
    """RAG retrieval engine for matching commodity trader requests by semantic similarity."""

    def __init__(self, supabase_client: Any, embedding_service: Any):
        self.supabase_client = supabase_client
        self.embedding_service = embedding_service

    def normalize_utterance(self, text: str) -> str:
        """Lowercase and strip punctuation from the utterance."""
        if not text:
            return ""
        text = text.lower()
        # Strip punctuation (keep unicode letters/numbers and whitespace)
        text = re.sub(r'[^\w\s]', '', text)
        return text.strip()

    async def retrieve(
        self,
        utterance: str,
        top_k: int = 3,
        min_similarity: float = 0.45
    ) -> RetrievalResult:
        """
        Query intent_examples by semantic similarity.
        Tries calling Supabase RPC, falls back to Python-side in-memory cosine search if RPC is missing.
        """
        # Step 1: Normalize utterance (simple, no LLM)
        normalized = self.normalize_utterance(utterance)

        # Step 2: Embed the input (as-is, using the original query for cross-lingual support)
        try:
            query_embedding = self.embedding_service.embed(utterance)
            if hasattr(query_embedding, "tolist"):
                query_vec = query_embedding.tolist()
            else:
                query_vec = list(query_embedding)
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            return RetrievalResult(
                examples=[],
                retrieval_confidence=0.0,
                dominant_intent=None,
                dominant_category=None,
                retrieval_used=False
            )

        # Step 3: pgvector cosine search (RPC primary, in-memory fallback secondary)
        db_results = []
        try:
            res = self.supabase_client.rpc(
                "match_intent_examples",
                {
                    "query_embedding": query_vec,
                    "match_threshold": 0.0,  # Filter after fetching top candidates
                    "match_count": top_k * 3
                }
            ).execute()
            db_results = res.data or []
            logger.info(f"Retrieved {len(db_results)} raw results from Supabase RPC.")
        except Exception as exc:
            logger.warning(f"Supabase RPC match_intent_examples failed ({exc}). Falling back to in-memory cosine search.")
            db_results = await self._fallback_retrieve(query_vec, top_k * 3)

        # Step 4: Filter and rank
        kept: List[RetrievedExample] = []
        for row in db_results:
            similarity = float(row.get("similarity", 0))
            if similarity >= min_similarity:
                example = RetrievedExample(
                    utterance=row.get("utterance", ""),
                    intent=row.get("intent", ""),
                    intent_category=row.get("intent_category", ""),
                    entities=row.get("entities") or {},
                    action=row.get("action") or {},
                    similarity=similarity,
                    language=row.get("utterance_language") or "en"
                )
                kept.append(example)

        # Sort by similarity DESC
        kept.sort(key=lambda x: x.similarity, reverse=True)
        # Limit to top_k
        kept = kept[:top_k]

        # Step 5 & 6: Calculate retrieval metadata and return RetrievalResult
        if kept:
            retrieval_confidence = sum(e.similarity for e in kept) / len(kept)
            
            intent_counts = Counter(e.intent for e in kept)
            dominant_intent = intent_counts.most_common(1)[0][0]
            
            category_counts = Counter(e.intent_category for e in kept)
            dominant_category = category_counts.most_common(1)[0][0]
            
            retrieval_used = True
        else:
            retrieval_confidence = 0.0
            dominant_intent = None
            dominant_category = None
            retrieval_used = False

        return RetrievalResult(
            examples=kept,
            retrieval_confidence=retrieval_confidence,
            dominant_intent=dominant_intent,
            dominant_category=dominant_category,
            retrieval_used=retrieval_used
        )

    async def _fallback_retrieve(self, query_vec: List[float], limit: int) -> List[Dict[str, Any]]:
        """Brute-force in-memory cosine search fallback when database RPC function is missing."""
        try:
            res = (
                self.supabase_client.table("intent_examples")
                .select("id, utterance, utterance_language, utterance_script, utterance_normalized, intent, intent_category, entities, action, requires_context, requires_confirmation, is_ambiguous, difficulty, source, region, trader_type, utterance_embedding")
                .not_.is_("utterance_embedding", "null")
                .execute()
            )
            data = res.data or []
        except Exception as e:
            logger.error(f"Database query failed during fallback retrieve: {e}")
            return []

        q = np.array(query_vec, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm == 0:
            return []

        scored = []
        for row in data:
            emb = row.get("utterance_embedding")
            if not emb:
                continue
            if isinstance(emb, str):
                try:
                    # Handle string-formatted arrays
                    emb = json.loads(emb)
                except Exception:
                    continue
            
            v = np.array(emb, dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                continue
            
            sim = float(np.dot(q, v) / (q_norm * v_norm))
            scored.append((sim, row))

        # Sort descending by similarity
        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for sim, row in scored[:limit]:
            row_copy = dict(row)
            row_copy["similarity"] = sim
            results.append(row_copy)
        
        return results

    def build_rag_context(
        self,
        retrieval: RetrievalResult,
        current_utterance: str
    ) -> str:
        """Builds the few-shot examples block to inject into the dialogue prompt."""
        if not retrieval.retrieval_used:
            return ""

        parts = ["Here are similar requests from commodity traders and their\ncorrect interpretations:\n"]
        for idx, ex in enumerate(retrieval.examples, 1):
            entities = ex.entities or {}
            comm = entities.get("commodity_canonical") or entities.get("commodity") or "N/A"
            qty = entities.get("quantity")
            if qty is None:
                qty = "N/A"

            parts.append(
                f"Example {idx} ({ex.similarity:.0%} match):\n"
                f"Trader said: '{ex.utterance}'\n"
                f"Correct interpretation: intent={ex.intent},\n"
                f"  commodity={comm},\n"
                f"  quantity={qty}\n"
            )

        parts.append(f"Now interpret this new request:\n'{current_utterance}'")
        return "\n".join(parts)
