"""
TradeNexus — Commodity Intelligence Agent.

Implements the 4-Tier Linguistic Resolution Cascade to translate regional
commodity dialects (Hindi, Marathi, Gujarati, Telugu, Tamil, etc.) to canonical forms:
- Tier 1: SQL Exact Match (~5ms)
- Tier 2: Trigram Similarity Match (~15ms)
- Tier 3: Multilingual Semantic Vector Match via SentenceTransformers (~40ms)
- Tier 4: Nvidia LLM Cognitive Fallback (~1-2s)

Includes user feedback loops to adaptively learn new alias variants.
"""

import csv
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict
from core.database import get_supabase_client
from core.llm_provider import get_llm_provider
from core.embedding_service import get_embedding_service


class CommodityIntelligenceAgent:
    """Agent responsible for multilingual commodity name resolution cascade."""

    CANONICAL_COMMODITIES = [
        "Cotton", "Wheat", "Rice", "Soybean", "Turmeric", 
        "Chilli", "Groundnut", "Sugarcane", "Onion", "Mustard"
    ]

    def __init__(self):
        self.supabase = get_supabase_client()
        self.llm = get_llm_provider()
        self.embedder = get_embedding_service()
        
        # Load local cache from seed CSV for fast offline/fallback matches
        self.local_aliases = self._load_local_aliases()
        # Generate embeddings for local cache to support local vector matching fallback
        self.local_embeddings = {}

    def _load_local_aliases(self) -> List[Dict]:
        """Loads static commodity aliases from CSV."""
        csv_path = Path(__file__).resolve().parents[3] / "data" / "seeds" / "commodity_aliases.csv"
        aliases = []
        if csv_path.exists():
            try:
                with open(csv_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        aliases.append({
                            "canonical_name": row["canonical_name"],
                            "alias": row["alias"],
                            "language": row["language"],
                            "region": row["region"],
                            "confidence": float(row["confidence"])
                        })
                return aliases
            except Exception as e:
                print(f"[CommodityIntelligence] Error reading aliases CSV: {e}")
        
        # Fallback array if seed CSV cannot be loaded
        return [
            {"canonical_name": "Cotton", "alias": "Kapas", "language": "hi", "region": "Maharashtra", "confidence": 1.0},
            {"canonical_name": "Wheat", "alias": "Gehun", "language": "hi", "region": "Uttar Pradesh", "confidence": 1.0},
            {"canonical_name": "Rice", "alias": "Chawal", "language": "hi", "region": "Bihar", "confidence": 1.0},
            {"canonical_name": "Soybean", "alias": "Soyabean", "language": "hi", "region": "Madhya Pradesh", "confidence": 1.0},
            {"canonical_name": "Turmeric", "alias": "Haldi", "language": "hi", "region": "Maharashtra", "confidence": 1.0},
            {"canonical_name": "Onion", "alias": "Kanda", "language": "mr", "region": "Maharashtra", "confidence": 1.0},
            {"canonical_name": "Mustard", "alias": "Sarson", "language": "hi", "region": "Rajasthan", "confidence": 1.0},
        ]

    def _get_local_alias_embeddings(self) -> Dict[str, np.ndarray]:
        """Lazily builds embeddings for local cache to minimize startup overhead."""
        if not self.local_embeddings and self.local_aliases:
            try:
                aliases_texts = [a["alias"] for a in self.local_aliases]
                vectors = self.embedder.get_embeddings(aliases_texts)
                for alias, vector in zip(aliases_texts, vectors):
                    self.local_embeddings[alias.lower()] = np.array(vector)
            except Exception as e:
                print(f"[CommodityIntelligence] Local embeddings generation failed: {e}")
        return self.local_embeddings

    async def resolve(self, query: str, language: Optional[str] = None) -> dict:
        """
        Main interface executing the 4-Tier Linguistic Resolution Cascade.
        Resolves query to canonical name.
        """
        query_clean = query.strip().lower()
        
        # Guard check: if query is already canonical
        for canonical in self.CANONICAL_COMMODITIES:
            if query_clean == canonical.lower():
                return {
                    "canonical_name": canonical,
                    "resolved_via": "guard_clause",
                    "confidence": 1.0,
                    "query": query
                }

        # --- Tier 1: SQL Exact Match ---
        t1_res = await self._tier1_sql_exact(query_clean)
        if t1_res:
            return {**t1_res, "resolved_via": "tier1_exact_match", "query": query}

        # --- Tier 2: Trigram Similarity Match ---
        t2_res = await self._tier2_trigram_match(query_clean)
        if t2_res:
            return {**t2_res, "resolved_via": "tier2_trigram_match", "query": query}

        # --- Tier 3: Multilingual Semantic Vector Match ---
        t3_res = await self._tier3_semantic_vector_match(query_clean)
        if t3_res:
            return {**t3_res, "resolved_via": "tier3_semantic_vector", "query": query}

        # --- Tier 4: Nvidia LLM Cognitive Fallback ---
        t4_res = await self._tier4_llm_fallback(query_clean, language)
        if t4_res:
            # Auto-learn feedback: record newly resolved alias in database background
            await self.learn(query, t4_res["canonical_name"], language or "en")
            return {**t4_res, "resolved_via": "tier4_llm_fallback", "query": query}

        # Absolute Fallback (Default to Wheat if unresolved)
        return {
            "canonical_name": "Wheat",
            "resolved_via": "absolute_fallback",
            "confidence": 0.1,
            "query": query
        }

    async def _tier1_sql_exact(self, query: str) -> Optional[dict]:
        """SQL Exact Match check against database or local cache."""
        try:
            res = self.supabase.table("commodity_aliases").select("canonical_name, confidence").eq("alias", query).execute()
            if res.data:
                return {
                    "canonical_name": res.data[0]["canonical_name"],
                    "confidence": float(res.data[0].get("confidence", 1.0))
                }
        except Exception:
            # Database offline fallback: search local cache
            for a in self.local_aliases:
                if a["alias"].lower() == query:
                    return {
                        "canonical_name": a["canonical_name"],
                        "confidence": a["confidence"]
                    }
        return None

    async def _tier2_trigram_match(self, query: str) -> Optional[dict]:
        """Fuzzy matching using Trigram similarity in DB or Python-based difflib."""
        # Try database pg_trgm first
        try:
            # Assuming custom RPC is created: resolve_trigram_alias
            res = self.supabase.rpc("resolve_trigram_alias", {"query_term": query}).execute()
            if res.data and len(res.data) > 0:
                best = res.data[0]
                if best.get("similarity", 0) > 0.6:
                    return {
                        "canonical_name": best["canonical_name"],
                        "confidence": round(float(best.get("similarity", 0.8)), 2)
                    }
        except Exception:
            pass

        # Python-based fuzzy fallback matching using difflib Levenshtein
        from difflib import get_close_matches
        aliases = [a["alias"] for a in self.local_aliases]
        matches = get_close_matches(query, aliases, n=1, cutoff=0.7)
        if matches:
            matched_alias = matches[0]
            for a in self.local_aliases:
                if a["alias"] == matched_alias:
                    return {
                        "canonical_name": a["canonical_name"],
                        "confidence": round(a["confidence"] * 0.95, 2)
                    }
        return None

    async def _tier3_semantic_vector_match(self, query: str) -> Optional[dict]:
        """Semantic Vector match using localized SentenceTransformers and cosine similarity."""
        try:
            query_embedding = self.embedder.get_embedding(query)
            
            # 1. Try Supabase pgvector RPC
            try:
                res = self.supabase.rpc("match_commodity_aliases", {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.8,
                    "match_count": 1
                }).execute()
                if res.data:
                    return {
                        "canonical_name": res.data[0]["canonical_name"],
                        "confidence": round(float(res.data[0].get("similarity", 0.85)), 2)
                    }
            except Exception:
                pass

            # 2. Local Numpy cosine similarity calculation fallback
            local_embeds = self._get_local_alias_embeddings()
            if local_embeds:
                query_vec = np.array(query_embedding)
                best_similarity = -1.0
                best_alias = None

                for alias, vec in local_embeds.items():
                    # Cosine similarity formula
                    dot_product = np.dot(query_vec, vec)
                    norm_q = np.linalg.norm(query_vec)
                    norm_v = np.linalg.norm(vec)
                    similarity = dot_product / (norm_q * norm_v) if norm_q > 0 and norm_v > 0 else 0.0

                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_alias = alias

                if best_similarity > 0.82:  # Safe embedding matching threshold
                    for a in self.local_aliases:
                        if a["alias"].lower() == best_alias:
                            return {
                                "canonical_name": a["canonical_name"],
                                "confidence": round(best_similarity, 2)
                            }
        except Exception as e:
            print(f"[CommodityIntelligence] Semantic vector resolution failed: {e}")
        return None

    async def _tier4_llm_fallback(self, query: str, language: Optional[str]) -> Optional[dict]:
        """Nvidia LLM Cognitive fallback resolving the query term to a canonical list."""
        system_prompt = (
            "You are TradeNexus's regional language agricultural intelligence officer.\n"
            "Your job is to take a regional Indian commodity term (Hindi, Marathi, Gujarati, etc.) "
            "and resolve it to exactly one canonical crop name from this list:\n"
            f"{', '.join(self.CANONICAL_COMMODITIES)}\n\n"
            "Respond strictly in single-line JSON format with fields:\n"
            "- 'canonical_name': the resolved canonical crop from the list.\n"
            "- 'confidence': float between 0.0 and 1.0 reflecting confidence.\n"
            "Output only raw JSON, no markdown, no conversational text."
        )

        user_prompt = f"Resolve regional commodity query term: '{query}'"
        if language:
            user_prompt += f" in language context: '{language}'"

        try:
            raw_response = await self.llm.generate(system_prompt, user_prompt, temperature=0.1)
            clean_str = raw_response.strip()
            if clean_str.startswith("```json"):
                clean_str = clean_str.split("```json")[1].split("```")[0].strip()
            elif clean_str.startswith("```"):
                clean_str = clean_str.split("```")[1].split("```")[0].strip()
            
            data = json_loads_safe(clean_str)
            if data and data.get("canonical_name") in self.CANONICAL_COMMODITIES:
                return {
                    "canonical_name": data["canonical_name"],
                    "confidence": float(data.get("confidence", 0.8))
                }
        except Exception as e:
            print(f"[CommodityIntelligence] LLM Fallback failed: {e}")
        return None

    async def learn(self, alias: str, canonical: str, language: str) -> dict:
        """Learn a new alias mapping and save it into the Supabase database."""
        new_row = {
            "canonical_name": canonical,
            "alias": alias.strip().lower(),
            "language": language or "en",
            "region": "Learnt Feedback",
            "confidence": 0.85
        }
        
        # Save to local cache
        self.local_aliases.append(new_row)
        
        # Try database upsert
        try:
            self.supabase.table("commodity_aliases").upsert(new_row, on_conflict="alias").execute()
            return {"status": "success", "message": "Alias persisted to online registry."}
        except Exception:
            return {"status": "cached", "message": "Alias saved locally to memory registry."}


# Backward-compatible wrapper
class AdaptiveAgent(CommodityIntelligenceAgent):
    """Alias for CommodityIntelligenceAgent to ensure backward compatibility."""
    pass


def json_loads_safe(text: str) -> Optional[dict]:
    """Graceful JSON loader."""
    try:
        import json
        return json.loads(text)
    except Exception:
        return None
