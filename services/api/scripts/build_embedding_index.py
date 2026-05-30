"""
TradeNexus — Build Embedding Index Script.

Standalone script. Run once after seeding, and again after each
Adaptive Data import, to embed all un-indexed commodity aliases.

Usage:
    cd services/api
    python scripts/build_embedding_index.py
"""

import sys
import os
import time

# Ensure services/api is on sys.path so core.* imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.embedding_service import get_embedding_service
from core.database import get_client


def main():
    print("=" * 60)
    print("TradeNexus — Embedding Index Builder")
    print("=" * 60)

    t0 = time.time()

    # Ensure DB connection is live
    try:
        sb = get_client()
        total_res = (
            sb.table("commodity_aliases")
            .select("id", count="exact")
            .execute()
        )
        total_aliases = total_res.count if total_res.count is not None else len(total_res.data or [])
        print(f"Total aliases in database: {total_aliases}")
    except Exception as exc:
        print(f"Database connection failed: {exc}")
        print("Ensure SUPABASE_URL and SUPABASE_KEY are set in .env")
        sys.exit(1)

    svc = get_embedding_service()
    indexed = svc.index_all_unembedded()

    elapsed = round(time.time() - t0, 2)

    # Fetch final count of indexed rows
    try:
        indexed_res = (
            sb.table("commodity_aliases")
            .select("id", count="exact")
            .not_.is_("embedding", "null")
            .execute()
        )
        total_indexed = indexed_res.count if indexed_res.count is not None else "?"
    except Exception:
        total_indexed = "?"

    print()
    print("-" * 60)
    print(f"Indexed {indexed} aliases. Total indexed: {total_indexed}")
    print(f"Elapsed: {elapsed}s")
    print("-" * 60)


if __name__ == "__main__":
    main()
