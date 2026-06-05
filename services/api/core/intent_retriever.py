"""
TradeNexus API — Intent RAG Retrieval Layer.

Matches user trading queries against the multilingual intent_examples database
to inject relevant few-shot examples into the LLM classifier.
"""

from __future__ import annotations

import re
import json
import logging
from collections import defaultdict
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
import numpy as np

logger = logging.getLogger("intent_retriever")
logger.setLevel(logging.INFO)

# Reranking when query signals price/market intent (not alias mapping).
ALIAS_CORRECTION_PRICE_PENALTY = 0.85
MARKET_PRICE_QUERY_BOOST = 1.10
RELATED_MARKET_INTENT_DEMOTION = 0.85
RISK_PNL_ON_PRICE_QUERY_DEMOTION = 0.88
INVENTORY_ON_PRICE_QUERY_DEMOTION = 0.85

_RELATED_MARKET_INTENTS = frozenset({
    "market_trend_query",
    "market_forecast_query",
    "market_best_mandi_query",
})
_INVENTORY_INTENTS = frozenset({
    "inventory_query",
    "inventory_value_query",
    "inventory_add",
    "inventory_set",
    "inventory_subtract",
})

# Fetch extra candidates before rerank + diversity filtering.
CANDIDATE_POOL_MULTIPLIER = 10
MIN_CANDIDATE_POOL = 30

# Price / market intent indicators (applied only for alias_correction penalty).
_PRICE_INTENT_PATTERNS: Tuple[re.Pattern, ...] = (
    re.compile(r"भाव"),
    re.compile(r"भाव\s*क्या\s*है"),
    re.compile(r"कीमत"),
    re.compile(r"मूल्य"),
    re.compile(r"\bbhav\b", re.IGNORECASE),
    re.compile(r"\bbhaav\b", re.IGNORECASE),
    re.compile(r"\bprice\b", re.IGNORECASE),
    re.compile(r"\brate\b", re.IGNORECASE),
    re.compile(r"\bdaam\b", re.IGNORECASE),
    re.compile(r"price\s+today", re.IGNORECASE),
    re.compile(r"mandi\s+price", re.IGNORECASE),
    re.compile(r"market\s+price", re.IGNORECASE),
)


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

    @staticmethod
    def has_price_intent_indicators(text: str) -> bool:
        """True when the query likely asks for price/rate (not alias mapping)."""
        if not text:
            return False
        return any(p.search(text) for p in _PRICE_INTENT_PATTERNS)

    @staticmethod
    def detect_client_encoding_issue(text: str) -> bool:
        """
        Heuristic: literal question-mark runs with no non-ASCII chars suggest
        Windows/curl mangled UTF-8 before HTTP.
        """
        if not text:
            return False
        if "????" in text:
            return True
        q_count = text.count("?")
        has_non_ascii = any(ord(c) > 127 for c in text)
        return q_count >= 3 and not has_non_ascii

    def normalize_utterance(self, text: str) -> str:
        """Lowercase and strip punctuation from the utterance (not used for embedding)."""
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r"[^\w\s]", "", text)
        return text.strip()

    def _candidate_pool_size(self, top_k: int) -> int:
        return max(top_k * CANDIDATE_POOL_MULTIPLIER, MIN_CANDIDATE_POOL)

    def _row_to_example(self, row: Dict[str, Any], similarity: float) -> RetrievedExample:
        return RetrievedExample(
            utterance=row.get("utterance", ""),
            intent=row.get("intent", ""),
            intent_category=row.get("intent_category", ""),
            entities=row.get("entities") or {},
            action=row.get("action") or {},
            similarity=similarity,
            language=row.get("utterance_language") or "en",
        )

    def _apply_intent_reranking(
        self,
        candidates: List[RetrievedExample],
        utterance: str,
    ) -> List[Tuple[RetrievedExample, float]]:
        """
        Return (example, rank_score) pairs sorted by rank_score descending.
        Applies alias_correction penalty only when price indicators are present.
        """
        price_query = self.has_price_intent_indicators(utterance)
        if price_query:
            logger.debug("Price intent indicators detected — alias_correction penalty active.")

        scored: List[Tuple[RetrievedExample, float]] = []
        for ex in candidates:
            rank_score = ex.similarity
            if price_query:
                if ex.intent == "alias_correction":
                    rank_score *= ALIAS_CORRECTION_PRICE_PENALTY
                elif ex.intent == "market_price_query":
                    rank_score *= MARKET_PRICE_QUERY_BOOST
                elif ex.intent in _RELATED_MARKET_INTENTS:
                    rank_score *= RELATED_MARKET_INTENT_DEMOTION
                elif ex.intent == "risk_pnl_query":
                    rank_score *= RISK_PNL_ON_PRICE_QUERY_DEMOTION
                elif ex.intent in _INVENTORY_INTENTS:
                    rank_score *= INVENTORY_ON_PRICE_QUERY_DEMOTION
            scored.append((ex, rank_score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    @staticmethod
    def _alias_diversity_key(example: RetrievedExample) -> str:
        """
        Cluster near-identical alias_correction rows (e.g. Kapas -> Cotton
        across languages) so only the best match is kept.
        """
        entities = example.entities or {}
        commodity = (
            entities.get("commodity_canonical")
            or entities.get("commodity")
            or ""
        )
        commodity = str(commodity).strip().lower()
        if commodity:
            return f"alias:{commodity}"

        utt = example.utterance.lower()
        if "kapas" in utt or "कपास" in example.utterance or "cotton" in utt:
            return "alias:cotton"
        if "pyaz" in utt or "onion" in utt:
            return "alias:onion"
        if "gehun" in utt or "wheat" in utt or "गेहू" in example.utterance:
            return "alias:wheat"
        return f"alias:utt:{utt[:60]}"

    def _apply_diversity_filter(
        self,
        ranked: List[Tuple[RetrievedExample, float]],
        top_k: int,
    ) -> List[Tuple[RetrievedExample, float]]:
        """
        Keep at most one alias_correction per commodity cluster; preserve order
        by rank_score so other intents can enter the final top-k.
        """
        kept: List[Tuple[RetrievedExample, float]] = []
        seen_alias_clusters: set[str] = set()

        for ex, rank_score in ranked:
            if ex.intent == "alias_correction":
                cluster = self._alias_diversity_key(ex)
                if cluster in seen_alias_clusters:
                    continue
                seen_alias_clusters.add(cluster)

            kept.append((ex, rank_score))
            if len(kept) >= top_k:
                break

        return kept

    @staticmethod
    def _weighted_dominant_intent(
        examples: List[Tuple[RetrievedExample, float]],
    ) -> Tuple[Optional[str], Optional[str]]:
        """Similarity-weighted intent vote: sum(rank_score) per intent."""
        if not examples:
            return None, None

        intent_weights: Dict[str, float] = defaultdict(float)
        category_weights: Dict[str, float] = defaultdict(float)

        for ex, rank_score in examples:
            intent_weights[ex.intent] += rank_score
            category_weights[ex.intent_category] += rank_score

        dominant_intent = max(intent_weights, key=intent_weights.get)
        dominant_category = max(category_weights, key=category_weights.get)
        return dominant_intent, dominant_category

    async def retrieve(
        self,
        utterance: str,
        top_k: int = 3,
        min_similarity: float = 0.45,
    ) -> RetrievalResult:
        """
        Query intent_examples by semantic similarity with reranking, diversity
        filtering, and similarity-weighted dominant intent selection.
        """
        if self.detect_client_encoding_issue(utterance):
            logger.warning(
                "Potential client-side encoding issue detected in query: %r. "
                "On Windows use: chcp 65001 and curl.exe --data-urlencode \"q=...\"",
                utterance,
            )

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
                retrieval_used=False,
            )

        pool_size = self._candidate_pool_size(top_k)
        db_results: List[Dict[str, Any]] = []
        try:
            res = self.supabase_client.rpc(
                "match_intent_examples",
                {
                    "query_embedding": query_vec,
                    "match_threshold": 0.0,
                    "match_count": pool_size,
                },
            ).execute()
            db_results = res.data or []
            logger.info(
                "Retrieved %d candidates from Supabase RPC match_intent_examples.",
                len(db_results),
            )
        except Exception as exc:
            logger.warning(
                "Supabase RPC match_intent_examples failed (%s). "
                "Falling back to in-memory cosine search.",
                exc,
            )
            db_results = await self._fallback_retrieve(query_vec, pool_size)

        candidates: List[RetrievedExample] = []
        for row in db_results:
            similarity = float(row.get("similarity", 0))
            if similarity >= min_similarity:
                candidates.append(self._row_to_example(row, similarity))

        if not candidates:
            return RetrievalResult(
                examples=[],
                retrieval_confidence=0.0,
                dominant_intent=None,
                dominant_category=None,
                retrieval_used=False,
            )

        ranked = self._apply_intent_reranking(candidates, utterance)
        final_ranked = self._apply_diversity_filter(ranked, top_k)
        kept = [ex for ex, _ in final_ranked]

        retrieval_confidence = sum(ex.similarity for ex in kept) / len(kept)
        dominant_intent, dominant_category = self._weighted_dominant_intent(final_ranked)

        return RetrievalResult(
            examples=kept,
            retrieval_confidence=retrieval_confidence,
            dominant_intent=dominant_intent,
            dominant_category=dominant_category,
            retrieval_used=True,
        )

    async def _fallback_retrieve(self, query_vec: List[float], limit: int) -> List[Dict[str, Any]]:
        """Brute-force in-memory cosine search when database RPC function is missing."""
        try:
            res = (
                self.supabase_client.table("intent_examples")
                .select(
                    "id, utterance, utterance_language, utterance_script, "
                    "utterance_normalized, intent, intent_category, entities, action, "
                    "requires_context, requires_confirmation, is_ambiguous, difficulty, "
                    "source, region, trader_type, utterance_embedding"
                )
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
                    emb = json.loads(emb)
                except Exception:
                    continue

            v = np.array(emb, dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                continue

            sim = float(np.dot(q, v) / (q_norm * v_norm))
            scored.append((sim, row))

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
        current_utterance: str,
    ) -> str:
        """Builds the few-shot examples block to inject into the dialogue prompt."""
        if not retrieval.retrieval_used:
            return ""

        parts = [
            "Here are similar requests from commodity traders and their\n"
            "correct interpretations:\n"
        ]
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
