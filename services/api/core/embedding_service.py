"""
TradeNexus API — Multilingual Embedding Service.

Manages the sentence-transformer model (paraphrase-multilingual-MiniLM-L12-v2)
and pgvector operations for Tier-3 semantic search in the commodity resolution cascade.
"""

from __future__ import annotations

from typing import List, Optional
from functools import lru_cache

import numpy as np


class EmbeddingService:
    """Lazy-loaded multilingual embedding service backed by pgvector."""

    MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
    DIMENSION = 384

    def __init__(self):
        self._model = None

    # ------------------------------------------------------------------
    # Model management
    # ------------------------------------------------------------------

    @property
    def model(self):
        """Lazily load the sentence-transformers model on first use."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            print(f"[EmbeddingService] Loading model: {self.MODEL_NAME} ...")
            self._model = SentenceTransformer(self.MODEL_NAME)
            print("[EmbeddingService] Model loaded.")
        return self._model

    # ------------------------------------------------------------------
    # Embedding generation
    # ------------------------------------------------------------------

    def embed(self, text: str) -> np.ndarray:
        """Return a 384-dimensional embedding vector for a single text string."""
        return self.model.encode(text, convert_to_numpy=True)

    def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        """Return embeddings for a list of texts."""
        vectors = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return list(vectors)

    # ------------------------------------------------------------------
    # pgvector search
    # ------------------------------------------------------------------

    def search_similar(
        self,
        query_text: str,
        top_k: int = 5,
    ) -> List[dict]:
        """
        Search commodity_aliases by cosine similarity against pgvector embeddings.

        Returns a list of dicts:
            {alias_id, alias_text, canonical_name, commodity_id, similarity_score}
        """
        from core.database import get_client

        query_vec = self.embed(query_text).tolist()
        sb = get_client()

        try:
            # Supabase RPC wrapping:
            #   SELECT ca.id, ca.alias_text, c.canonical_name, ca.commodity_id,
            #          1 - (ca.embedding <=> $1) AS similarity_score
            #   FROM commodity_aliases ca
            #   JOIN commodities c ON c.id = ca.commodity_id
            #   WHERE ca.embedding IS NOT NULL
            #   ORDER BY ca.embedding <=> $1
            #   LIMIT $2;
            res = sb.rpc(
                "match_commodity_aliases",
                {
                    "query_embedding": query_vec,
                    "match_threshold": 0.0,
                    "match_count": top_k,
                },
            ).execute()

            if res.data:
                return [
                    {
                        "alias_id": row.get("id"),
                        "alias_text": row.get("alias_text"),
                        "canonical_name": row.get("canonical_name"),
                        "commodity_id": row.get("commodity_id"),
                        "similarity_score": round(float(row.get("similarity", 0)), 4),
                    }
                    for row in res.data
                ]
        except Exception as exc:
            print(f"[EmbeddingService] pgvector RPC search failed: {exc}")

        # -----------------------------------------------------------------
        # Fallback: in-memory cosine similarity against all embedded aliases
        # -----------------------------------------------------------------
        return self._fallback_search(query_vec, top_k)

    def _fallback_search(
        self, query_vec: list[float], top_k: int
    ) -> List[dict]:
        """Brute-force cosine search when pgvector RPC is unavailable."""
        from core.database import get_client

        sb = get_client()
        try:
            res = (
                sb.table("commodity_aliases")
                .select("id, alias_text, commodity_id, embedding")
                .not_.is_("embedding", "null")
                .execute()
            )
        except Exception:
            return []

        if not res.data:
            return []

        q = np.array(query_vec, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm == 0:
            return []

        scored: list[tuple[float, dict]] = []
        for row in res.data:
            emb = row.get("embedding")
            if emb is None:
                continue
            v = np.array(emb, dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                continue
            sim = float(np.dot(q, v) / (q_norm * v_norm))
            scored.append((sim, row))

        scored.sort(key=lambda x: x[0], reverse=True)

        results: list[dict] = []
        for sim, row in scored[:top_k]:
            results.append(
                {
                    "alias_id": row["id"],
                    "alias_text": row["alias_text"],
                    "canonical_name": None,  # caller can look up via commodity_id
                    "commodity_id": row["commodity_id"],
                    "similarity_score": round(sim, 4),
                }
            )
        return results

    # ------------------------------------------------------------------
    # Indexing helpers
    # ------------------------------------------------------------------

    def index_alias(self, alias_id: str, alias_text: str) -> None:
        """Embed a single alias and write the vector back to Supabase."""
        from core.database import get_client

        vec = self.embed(alias_text).tolist()
        sb = get_client()
        sb.table("commodity_aliases").update({"embedding": vec}).eq(
            "id", alias_id
        ).execute()

    def index_all_unembedded(self) -> int:
        """
        Batch-embed every commodity_aliases row whose embedding IS NULL.

        Returns the total number of rows indexed in this run.
        """
        from core.database import get_client

        sb = get_client()

        # Fetch all un-embedded rows
        res = (
            sb.table("commodity_aliases")
            .select("id, alias_text")
            .is_("embedding", "null")
            .execute()
        )
        rows = res.data or []
        total = len(rows)
        if total == 0:
            print("[EmbeddingService] No un-embedded aliases found.")
            return 0

        print(f"[EmbeddingService] {total} un-embedded aliases to process.")

        indexed = 0
        batch_size = 64
        for i in range(0, total, batch_size):
            batch = rows[i : i + batch_size]
            texts = [r["alias_text"] for r in batch]
            vectors = self.embed_batch(texts)

            for row, vec in zip(batch, vectors):
                try:
                    sb.table("commodity_aliases").update(
                        {"embedding": vec.tolist()}
                    ).eq("id", row["id"]).execute()
                    indexed += 1
                except Exception as exc:
                    print(f"[EmbeddingService] Failed to index alias {row['id']}: {exc}")

            if (i + batch_size) % 50 < batch_size or i + batch_size >= total:
                print(f"[EmbeddingService] Progress: {min(i + batch_size, total)}/{total}")

        return indexed


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Return a cached singleton instance of the EmbeddingService."""
    return EmbeddingService()
