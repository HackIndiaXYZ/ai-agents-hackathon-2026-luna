"""
TradeNexus Pipeline — Export Aliases for Adaptation.

Standalone script that connects to Supabase and exports:
1. All ``feedback_events`` with ``event_type='alias_correction'`` from the last 60 days
2. All ``commodity_aliases`` with ``source='user'`` OR ``source='llm_inferred'``

Merges, deduplicates, and writes a JSONL file ready for the Adaption platform.

Usage:
    python pipeline/export_aliases.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add services/api to sys.path so we can reuse core modules
API_DIR = Path(__file__).resolve().parents[0].parent / "services" / "api"
sys.path.insert(0, str(API_DIR))

from core.database import get_supabase_client  # noqa: E402
from core.config import get_settings  # noqa: E402


OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def export_aliases() -> None:
    """Query Supabase, merge sources, deduplicate, and write JSONL."""
    settings = get_settings()  # ensures .env is loaded
    sb = get_supabase_client()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "aliases_for_adaptation.jsonl"

    seen: set[tuple[str, str]] = set()  # (alias_lower, canonical)
    rows: list[dict] = []

    # ------------------------------------------------------------------
    # Source 1 — feedback_events (alias corrections, last 60 days)
    # ------------------------------------------------------------------
    cutoff = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    try:
        fe_res = (
            sb.table("feedback_events")
            .select("original_value, corrected_value, language")
            .eq("event_type", "alias_correction")
            .gte("created_at", cutoff)
            .execute()
        )
        for r in fe_res.data or []:
            alias = (r.get("original_value") or "").strip().lower()
            canonical = r.get("corrected_value") or ""
            if not alias or not canonical:
                continue
            key = (alias, canonical.lower())
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "input": alias,
                "output": canonical,
                "language": r.get("language", "en"),
                "region": None,
                "confidence": 0.95,
                "source": "user_correction",
            })
    except Exception as exc:
        print(f"[export] feedback_events query failed: {exc}")

    # ------------------------------------------------------------------
    # Source 2 — commodity_aliases (user + llm_inferred)
    # ------------------------------------------------------------------
    try:
        for src in ("user", "llm_inferred"):
            ca_res = (
                sb.table("commodity_aliases")
                .select("alias_text, commodity_id, language, region, confidence_score")
                .eq("source", src)
                .execute()
            )
            for r in ca_res.data or []:
                alias = (r.get("alias_text") or "").strip().lower()
                commodity_id = r.get("commodity_id")
                if not alias or not commodity_id:
                    continue
                # Resolve canonical name
                canon_res = (
                    sb.table("commodities")
                    .select("canonical_name")
                    .eq("id", commodity_id)
                    .limit(1)
                    .execute()
                )
                canonical = (
                    canon_res.data[0]["canonical_name"] if canon_res.data else None
                )
                if not canonical:
                    continue
                key = (alias, canonical.lower())
                if key in seen:
                    continue
                seen.add(key)
                rows.append({
                    "input": alias,
                    "output": canonical,
                    "language": r.get("language", "en"),
                    "region": r.get("region"),
                    "confidence": float(r.get("confidence_score", 0.8)),
                    "source": f"db_{src}",
                })
    except Exception as exc:
        print(f"[export] commodity_aliases query failed: {exc}")

    # ------------------------------------------------------------------
    # Write JSONL
    # ------------------------------------------------------------------
    with open(output_path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    # Language breakdown
    lang_counts = Counter(r["language"] for r in rows)
    print(f"Exported {len(rows)} rows. Language breakdown: {dict(lang_counts)}")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    export_aliases()
