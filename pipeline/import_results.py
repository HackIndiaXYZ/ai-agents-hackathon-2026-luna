"""
TradeNexus Pipeline — Import Adapted Results.

Standalone script that:
1. Reads the latest ``pipeline/output/aliases_adapted_{date}.jsonl``
2. Resolves each canonical name → ``commodity_id``
3. Upserts into ``commodity_aliases`` with ``source='adaptive_data'``
   (skips if an exact alias already exists with higher confidence)
4. Rebuilds the embedding index

Completes the Adaptive Data loop:
    User corrections → Export → Adaption Platform → **Import** → Embeddings

Usage:
    python pipeline/import_results.py
"""

from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

# Add services/api to sys.path so we can reuse core modules
API_DIR = Path(__file__).resolve().parents[0].parent / "services" / "api"
sys.path.insert(0, str(API_DIR))

from core.database import get_supabase_client  # noqa: E402
from core.config import get_settings  # noqa: E402
from core.embedding_service import get_embedding_service  # noqa: E402

OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def _find_latest_adapted() -> Path | None:
    """Find the most recent ``aliases_adapted_*.jsonl`` file."""
    pattern = str(OUTPUT_DIR / "aliases_adapted_*.jsonl")
    files = sorted(glob.glob(pattern), reverse=True)
    return Path(files[0]) if files else None


def import_results() -> None:
    """Read adapted JSONL, upsert into Supabase, and rebuild embeddings."""
    settings = get_settings()
    sb = get_supabase_client()

    input_path = _find_latest_adapted()
    if input_path is None:
        print("[import] No aliases_adapted_*.jsonl found in pipeline/output/.")
        print("[import] Run `python pipeline/run_adaptation.py` first.")
        return

    print(f"[import] Reading from {input_path}")

    records: list[dict] = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if stripped:
                records.append(json.loads(stripped))

    if not records:
        print("[import] File is empty — nothing to import.")
        return

    # ------------------------------------------------------------------
    # Build canonical_name → commodity_id lookup
    # ------------------------------------------------------------------
    canon_res = sb.table("commodities").select("id, canonical_name").execute()
    name_to_id: dict[str, str] = {
        r["canonical_name"]: r["id"] for r in (canon_res.data or [])
    }

    imported = 0
    skipped = 0

    for r in records:
        canonical = r.get("output", "").strip()
        alias_text = r.get("input", "").strip().lower()
        if not canonical or not alias_text:
            skipped += 1
            continue

        commodity_id = name_to_id.get(canonical)
        if not commodity_id:
            print(f"[import] Unknown canonical name '{canonical}' — skipped.")
            skipped += 1
            continue

        new_confidence = float(r.get("confidence", 0.8))

        # Check if a higher-confidence alias already exists
        try:
            existing = (
                sb.table("commodity_aliases")
                .select("id, confidence_score")
                .eq("alias_text", alias_text)
                .eq("commodity_id", commodity_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                current_conf = float(existing.data[0].get("confidence_score", 0))
                if current_conf > new_confidence:
                    skipped += 1
                    continue
        except Exception:
            pass

        # Upsert
        try:
            sb.table("commodity_aliases").upsert(
                {
                    "commodity_id": commodity_id,
                    "alias_text": alias_text,
                    "language": r.get("language", "en"),
                    "region": r.get("region"),
                    "source": "adaptive_data",
                    "confidence_score": new_confidence,
                },
                on_conflict="alias_text,language,commodity_id",
            ).execute()
            imported += 1
        except Exception as exc:
            print(f"[import] Upsert failed for '{alias_text}': {exc}")
            skipped += 1

    print(f"[import] Imported {imported} new aliases, skipped {skipped}.")

    # ------------------------------------------------------------------
    # Rebuild embedding index
    # ------------------------------------------------------------------
    print("[import] Rebuilding embedding index for all un-embedded aliases...")
    embedder = get_embedding_service()
    indexed = embedder.index_all_unembedded()
    print(f"[import] Indexed {indexed} alias embeddings.")
    print(f"[import] Imported {imported} new aliases. Rebuilt embedding index.")


if __name__ == "__main__":
    import_results()
