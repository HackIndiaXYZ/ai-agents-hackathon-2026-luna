"""
TradeNexus — Commodity Agent.

The core differentiator: a 4-tier linguistic resolution cascade that maps
regional / multilingual commodity names to canonical forms.

    Tier 1: Exact SQL match          (< 1 ms)
    Tier 2: Trigram fuzzy match      (< 10 ms)
    Tier 3: Embedding cosine match   (< 100 ms)
    Tier 4: LLM cognitive fallback   (2-4 s)

Includes user-correction ingestion, auto-learning after LLM hits,
feedback logging to the ``feedback_events`` table, and resolution
analytics for the dashboard "Learning Activity" widget.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from core.embedding_service import EmbeddingService
from core.llm_provider import LLMProvider

logger = logging.getLogger("commodity_agent")
logger.setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# Pydantic response model
# ---------------------------------------------------------------------------

class ResolutionResult(BaseModel):
    """Structured result returned by the resolution cascade."""

    canonical_name: Optional[str] = None
    commodity_id: Optional[str] = None
    confidence: float = 0.0
    tier: Literal["exact", "trigram", "embedding", "llm", "unknown"] = "unknown"
    original_input: str
    alias_used: Optional[str] = None
    language_detected: Optional[str] = None


# ---------------------------------------------------------------------------
# Commodity Agent
# ---------------------------------------------------------------------------

class CommodityAgent:
    """Multilingual commodity-name resolver with adaptive learning."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        llm_provider: LLMProvider,
        supabase_client,
    ):
        self.embedder = embedding_service
        self.llm = llm_provider
        self.sb = supabase_client

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def resolve(
        self,
        input_text: str,
        language_hint: str | None = None,
    ) -> ResolutionResult:
        """
        Run the 4-tier resolution cascade and return a ``ResolutionResult``.

        Every attempt is logged to ``feedback_events`` regardless of outcome.
        """
        text = input_text.strip()

        # --- Tier 1: Exact match ---
        result = await self._tier1_exact(text)
        if result:
            await self._log_resolution(text, result, language_hint)
            return result

        # --- Tier 2: Trigram fuzzy ---
        result = await self._tier2_trigram(text)
        if result:
            await self._log_resolution(text, result, language_hint)
            return result

        # --- Tier 3: Embedding similarity ---
        result = await self._tier3_embedding(text)
        if result:
            await self._log_resolution(text, result, language_hint)
            return result

        # --- Tier 4: LLM fallback ---
        result = await self._tier4_llm(text, language_hint)
        if result:
            await self._log_resolution(text, result, language_hint)
            return result

        # --- Tier 5: Unknown ---
        unknown = ResolutionResult(
            original_input=input_text,
            tier="unknown",
        )
        await self._log_resolution(text, unknown, language_hint)
        return unknown

    # ------------------------------------------------------------------
    # Tier implementations
    # ------------------------------------------------------------------

    async def _tier1_exact(self, text: str) -> ResolutionResult | None:
        """Exact case-insensitive alias lookup."""
        try:
            res = (
                self.sb.table("commodity_aliases")
                .select("id, alias_text, commodity_id, confidence_score, language")
                .ilike("alias_text", text)
                .order("confidence_score", desc=True)
                .limit(1)
                .execute()
            )
            if not res.data:
                return None

            row = res.data[0]
            if float(row["confidence_score"]) < 0.85:
                return None

            canonical = await self._canonical_name(row["commodity_id"])
            return ResolutionResult(
                canonical_name=canonical,
                commodity_id=row["commodity_id"],
                confidence=round(float(row["confidence_score"]), 4),
                tier="exact",
                original_input=text,
                alias_used=row["alias_text"],
                language_detected=row.get("language"),
            )
        except Exception as exc:
            logger.warning("Tier-1 exact match failed: %s", exc)
            return None

    async def _tier2_trigram(self, text: str) -> ResolutionResult | None:
        """pg_trgm ``%`` fuzzy match."""
        try:
            res = self.sb.rpc(
                "resolve_trigram_alias", {"query_term": text}
            ).execute()
            if not res.data:
                return None

            best = res.data[0]
            sim = float(best.get("similarity", 0))
            if sim < 0.6:
                return None

            canonical = best.get("canonical_name") or await self._canonical_name(
                best["commodity_id"]
            )
            return ResolutionResult(
                canonical_name=canonical,
                commodity_id=best.get("commodity_id"),
                confidence=round(sim, 4),
                tier="trigram",
                original_input=text,
                alias_used=best.get("alias_text"),
                language_detected=best.get("language"),
            )
        except Exception as exc:
            logger.warning("Tier-2 trigram match failed: %s", exc)
            return None

    async def _tier3_embedding(self, text: str) -> ResolutionResult | None:
        """Cosine similarity search via EmbeddingService + pgvector."""
        try:
            hits = self.embedder.search_similar(text, top_k=1)
            if not hits:
                return None

            top = hits[0]
            score = float(top.get("similarity_score", 0))
            if score < 0.75:
                return None

            canonical = top.get("canonical_name") or await self._canonical_name(
                top["commodity_id"]
            )
            return ResolutionResult(
                canonical_name=canonical,
                commodity_id=top.get("commodity_id"),
                confidence=round(score, 4),
                tier="embedding",
                original_input=text,
                alias_used=top.get("alias_text"),
            )
        except Exception as exc:
            logger.warning("Tier-3 embedding match failed: %s", exc)
            return None

    async def _tier4_llm(
        self, text: str, language_hint: str | None
    ) -> ResolutionResult | None:
        """LLM cognitive fallback — ask Qwen to map the term."""
        try:
            # Build canonical-name list from the commodities table
            canon_res = (
                self.sb.table("commodities")
                .select("id, canonical_name")
                .execute()
            )
            if not canon_res.data:
                return None

            canonical_map: dict[str, str] = {
                r["canonical_name"]: r["id"] for r in canon_res.data
            }
            canonical_names = list(canonical_map.keys())

            system_prompt = (
                "You are a commodity resolver for Indian agricultural markets. "
                "The user has entered a commodity name in any Indian language or "
                "regional dialect. Map it to the closest commodity from this exact "
                f"list: {canonical_names}.\n"
                "If no reasonable match exists, return null for canonical_name.\n"
                'Respond ONLY with JSON: {"canonical_name": str|null, '
                '"confidence": float, "language": str}'
            )
            user_prompt = f"What commodity is '{text}'?"
            if language_hint:
                user_prompt += f" (language hint: {language_hint})"

            raw = await self.llm.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expect_json=True,
                max_tokens=200,
            )

            data = _safe_json(raw)
            if not data:
                return None

            resolved_name = data.get("canonical_name")
            if resolved_name is None or resolved_name not in canonical_map:
                return None

            parsed_confidence = float(data.get("confidence", 0.75))
            detected_lang = data.get("language", language_hint)
            commodity_id = canonical_map[resolved_name]

            # Auto-learn: store as new alias and index the embedding
            await self._store_alias(
                commodity_id=commodity_id,
                alias_text=text,
                language=detected_lang or "en",
                source="llm_inferred",
                confidence=parsed_confidence,
            )

            return ResolutionResult(
                canonical_name=resolved_name,
                commodity_id=commodity_id,
                confidence=round(parsed_confidence, 4),
                tier="llm",
                original_input=text,
                alias_used=text,
                language_detected=detected_lang,
            )
        except Exception as exc:
            logger.warning("Tier-4 LLM fallback failed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # User correction
    # ------------------------------------------------------------------

    async def process_correction(
        self,
        original_text: str,
        corrected_canonical: str,
        language: str,
    ) -> dict:
        """
        Accept a user correction, upsert an alias at high confidence,
        reindex the embedding, and log the event.
        """
        # Validate canonical name exists
        res = (
            self.sb.table("commodities")
            .select("id")
            .eq("canonical_name", corrected_canonical)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {"error": f"Unknown canonical commodity: {corrected_canonical}"}

        commodity_id = res.data[0]["id"]

        # Upsert alias
        alias_record = await self._store_alias(
            commodity_id=commodity_id,
            alias_text=original_text.strip().lower(),
            language=language,
            source="user",
            confidence=0.95,
        )

        # Log correction event
        self.sb.table("feedback_events").insert({
            "event_type": "alias_correction",
            "entity_type": "commodity_alias",
            "original_value": original_text,
            "corrected_value": corrected_canonical,
            "language": language,
        }).execute()

        # Invalidate Redis cache for this input text (best-effort)
        try:
            from core.redis_client import UpstashRedis
            redis = UpstashRedis()
            import asyncio
            await redis.delete(f"resolve:{original_text.strip().lower()}")
        except Exception:
            pass

        return {
            "status": "success",
            "alias": alias_record,
            "commodity_id": commodity_id,
            "canonical_name": corrected_canonical,
        }

    # ------------------------------------------------------------------
    # Resolution stats
    # ------------------------------------------------------------------

    async def get_resolution_stats(self) -> dict:
        """
        Aggregate resolution analytics from ``feedback_events``.

        Powers the dashboard "Learning Activity" widget.
        """
        try:
            # Total resolutions
            all_res = (
                self.sb.table("feedback_events")
                .select("id", count="exact")
                .eq("event_type", "alias_resolution")
                .execute()
            )
            total = all_res.count if all_res.count is not None else 0

            # Tier breakdown
            tier_breakdown: dict[str, int] = {}
            for tier in ("exact", "trigram", "embedding", "llm", "unknown"):
                tier_res = (
                    self.sb.table("feedback_events")
                    .select("id", count="exact")
                    .eq("event_type", "alias_resolution")
                    .eq("resolution_tier", tier)
                    .execute()
                )
                tier_breakdown[tier] = tier_res.count if tier_res.count is not None else 0

            # Corrections this week
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            corr_res = (
                self.sb.table("feedback_events")
                .select("id", count="exact")
                .eq("event_type", "alias_correction")
                .gte("created_at", week_ago)
                .execute()
            )
            corrections_week = corr_res.count if corr_res.count is not None else 0

            # Total aliases
            alias_res = (
                self.sb.table("commodity_aliases")
                .select("id", count="exact")
                .execute()
            )
            aliases_total = alias_res.count if alias_res.count is not None else 0

            # Languages covered
            lang_res = (
                self.sb.table("commodity_aliases")
                .select("language")
                .execute()
            )
            languages = set(r["language"] for r in (lang_res.data or []))

            # Recent activity — last 7 days
            recent: list[dict] = []
            for i in range(7):
                day = datetime.now(timezone.utc) - timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
                day_res = (
                    self.sb.table("feedback_events")
                    .select("id", count="exact")
                    .eq("event_type", "alias_resolution")
                    .gte("created_at", day_start)
                    .lte("created_at", day_end)
                    .execute()
                )
                recent.append({
                    "date": day.strftime("%Y-%m-%d"),
                    "count": day_res.count if day_res.count is not None else 0,
                })

            return {
                "total_resolutions": total,
                "tier_breakdown": tier_breakdown,
                "corrections_this_week": corrections_week,
                "aliases_total": aliases_total,
                "languages_covered": len(languages),
                "recent_activity": recent,
            }
        except Exception as exc:
            logger.error("Resolution stats query failed: %s", exc)
            return {
                "total_resolutions": 0,
                "tier_breakdown": {},
                "corrections_this_week": 0,
                "aliases_total": 0,
                "languages_covered": 0,
                "recent_activity": [],
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _canonical_name(self, commodity_id: str) -> str | None:
        """Look up the canonical name for a commodity UUID."""
        try:
            res = (
                self.sb.table("commodities")
                .select("canonical_name")
                .eq("id", commodity_id)
                .limit(1)
                .execute()
            )
            return res.data[0]["canonical_name"] if res.data else None
        except Exception:
            return None

    async def _store_alias(
        self,
        commodity_id: str,
        alias_text: str,
        language: str,
        source: str,
        confidence: float,
    ) -> dict:
        """
        Upsert an alias row and immediately index its embedding.

        Returns the upserted record.
        """
        row = {
            "commodity_id": commodity_id,
            "alias_text": alias_text.strip().lower(),
            "language": language,
            "source": source,
            "confidence_score": confidence,
        }
        try:
            res = (
                self.sb.table("commodity_aliases")
                .upsert(row, on_conflict="alias_text,language,commodity_id")
                .execute()
            )
            record = res.data[0] if res.data else row

            # Index the embedding for the new/updated alias
            alias_id = record.get("id")
            if alias_id:
                try:
                    self.embedder.index_alias(alias_id, alias_text)
                except Exception as emb_exc:
                    logger.warning("Embedding index for alias %s failed: %s", alias_id, emb_exc)

            return record
        except Exception as exc:
            logger.warning("Alias upsert failed: %s", exc)
            return row

    async def _log_resolution(
        self,
        input_text: str,
        result: ResolutionResult,
        language: str | None,
    ) -> None:
        """Write a resolution event to ``feedback_events``."""
        try:
            self.sb.table("feedback_events").insert({
                "event_type": "alias_resolution",
                "entity_type": "commodity_alias",
                "original_value": input_text,
                "corrected_value": result.canonical_name,
                "resolution_tier": result.tier,
                "language": result.language_detected or language,
            }).execute()
        except Exception as exc:
            logger.debug("Resolution log insert failed: %s", exc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_json(text: str) -> dict | None:
    """Parse JSON from an LLM response, stripping markdown fences if needed."""
    clean = text.strip()
    if clean.startswith("```"):
        # Remove ```json or ``` fences
        parts = clean.split("```")
        for part in parts:
            stripped = part.strip()
            if stripped.startswith("json"):
                stripped = stripped[4:].strip()
            if stripped.startswith("{"):
                clean = stripped
                break
    try:
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return None
