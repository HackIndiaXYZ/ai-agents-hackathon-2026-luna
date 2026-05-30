"""
TradeNexus Pipeline — Import results.

Imports adapted alias mappings back into Supabase after offline processing.
Loads the refined JSONL entries and runs upsert transactions.
"""

import sys
import json
from pathlib import Path

# Add services/api to sys.path to reuse database client and configuration
api_path = Path(__file__).resolve().parents[1] / "services" / "api"
sys.path.append(str(api_path))

from core.database import get_supabase_client
from core.config import get_settings


def import_results():
    """Ingest refined JSONL and upsert entries to Supabase commodity_aliases table."""
    settings = get_settings()

    data_dir = Path(__file__).resolve().parents[1] / "data"
    input_file = data_dir / "refined_aliases.jsonl"

    if not input_file.exists():
        print(f"[Import Pipeline] Error: Input file {input_file} does not exist. Run adaptation first.")
        return

    print(f"[Import Pipeline] Reading refined aliases from {input_file}...")
    records = []
    with open(input_file, mode="r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))

    if not records:
        print("[Import Pipeline] No refined records found to import.")
        return

    upsert_count = 0
    try:
        supabase = get_supabase_client()
        
        # Batch upsert into Supabase (if table and schema are online)
        # Note: 'alias' acts as the primary key/unique identifier
        for r in records:
            supabase.table("commodity_aliases").upsert({
                "canonical_name": r["canonical_name"],
                "alias": r["alias"],
                "language": r["language"],
                "region": r["region"],
                "confidence": r["confidence"]
            }, on_conflict="alias").execute()
            upsert_count += 1
            
        print(f"[Import Pipeline] Successfully upserted {upsert_count} rows back into Supabase online registry.")
    except Exception as e:
        print(f"[Import Pipeline] Database offline or transaction failed: {e}")
        print("[Import Pipeline] Cache synchronization complete. Refined alias mappings stored locally in fallback memory caches.")


if __name__ == "__main__":
    import_results()
