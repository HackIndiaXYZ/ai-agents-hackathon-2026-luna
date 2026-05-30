"""
TradeNexus API — Supabase database client.

Provides a singleton Supabase client and CSV-based seeding functions
for commodities, commodity_aliases, and trade_corridors tables.
"""

import csv
import asyncio
from pathlib import Path
from typing import Optional

from supabase import create_client, Client
from core.config import get_settings


_client: Client | None = None


def get_client() -> Client:
    """Return a shared Supabase client instance (singleton)."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set in .env to initialise the database client."
            )
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client


# Backward-compatible alias used by existing agent code
get_supabase_client = get_client


# -------------------------------------------------------------------------
# Seed helpers
# -------------------------------------------------------------------------

SEEDS_DIR = Path(__file__).resolve().parents[3] / "data" / "seeds"

# Canonical commodity definitions keyed by name
COMMODITY_CATALOG = {
    "Cotton":       {"category": "Fibre",     "unit_of_measure": "quintal"},
    "Pigeon Pea":   {"category": "Pulse",     "unit_of_measure": "quintal"},
    "Chickpea":     {"category": "Pulse",     "unit_of_measure": "quintal"},
    "Soybean":      {"category": "Oilseed",   "unit_of_measure": "quintal"},
    "Groundnut":    {"category": "Oilseed",   "unit_of_measure": "quintal"},
    "Wheat":        {"category": "Cereal",    "unit_of_measure": "quintal"},
    "Rice":         {"category": "Cereal",    "unit_of_measure": "quintal"},
    "Maize":        {"category": "Cereal",    "unit_of_measure": "quintal"},
    "Sorghum":      {"category": "Cereal",    "unit_of_measure": "quintal"},
    "Pearl Millet": {"category": "Cereal",    "unit_of_measure": "quintal"},
    "Mustard":      {"category": "Oilseed",   "unit_of_measure": "quintal"},
    "Sunflower":    {"category": "Oilseed",   "unit_of_measure": "quintal"},
    "Onion":        {"category": "Vegetable", "unit_of_measure": "quintal"},
    "Tomato":       {"category": "Vegetable", "unit_of_measure": "quintal"},
    "Potato":       {"category": "Vegetable", "unit_of_measure": "quintal"},
    "Turmeric":     {"category": "Spice",     "unit_of_measure": "quintal"},
    "Chilli":       {"category": "Spice",     "unit_of_measure": "quintal"},
    "Cumin":        {"category": "Spice",     "unit_of_measure": "quintal"},
    "Coriander":    {"category": "Spice",     "unit_of_measure": "quintal"},
    "Sesame":       {"category": "Oilseed",   "unit_of_measure": "quintal"},
    "Sugarcane":    {"category": "Cereal",    "unit_of_measure": "quintal"},
    "Lentil":       {"category": "Pulse",     "unit_of_measure": "quintal"},
    "Mung Bean":    {"category": "Pulse",     "unit_of_measure": "quintal"},
    "Black Gram":   {"category": "Pulse",     "unit_of_measure": "quintal"},
    "Jute":         {"category": "Fibre",     "unit_of_measure": "quintal"},
    "Castor":       {"category": "Oilseed",   "unit_of_measure": "quintal"},
    "Cardamom":     {"category": "Spice",     "unit_of_measure": "kg"},
    "Coconut":      {"category": "Vegetable", "unit_of_measure": "piece"},
    "Banana":       {"category": "Vegetable", "unit_of_measure": "quintal"},
}


async def seed_commodities() -> dict[str, str]:
    """
    Seed the commodities table and then commodity_aliases from the CSV.

    Returns a mapping of canonical_name -> commodity UUID for downstream use.
    """
    sb = get_client()
    name_to_id: dict[str, str] = {}

    # ------------------------------------------------------------------
    # 1. Upsert canonical commodities
    # ------------------------------------------------------------------
    for name, meta in COMMODITY_CATALOG.items():
        row = {
            "canonical_name": name,
            "category": meta["category"],
            "unit_of_measure": meta["unit_of_measure"],
        }
        try:
            res = sb.table("commodities").upsert(
                row, on_conflict="canonical_name"
            ).execute()
            if res.data:
                name_to_id[name] = res.data[0]["id"]
        except Exception as exc:
            print(f"[seed] commodity upsert skipped ({name}): {exc}")

    # If upsert didn't return ids, fetch them
    if not name_to_id:
        res = sb.table("commodities").select("id, canonical_name").execute()
        for r in res.data:
            name_to_id[r["canonical_name"]] = r["id"]

    # ------------------------------------------------------------------
    # 2. Seed commodity_aliases from CSV
    # ------------------------------------------------------------------
    csv_path = SEEDS_DIR / "commodity_aliases.csv"
    if not csv_path.exists():
        print(f"[seed] Alias CSV not found at {csv_path}")
        return name_to_id

    inserted = 0
    skipped = 0
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch: list[dict] = []
        for row in reader:
            canonical = row["canonical_name"]
            commodity_id = name_to_id.get(canonical)
            if not commodity_id:
                skipped += 1
                continue
            batch.append({
                "commodity_id": commodity_id,
                "alias_text": row["alias_text"],
                "language": row["language"],
                "region": row.get("region") or None,
                "confidence_score": float(row.get("confidence_score", 0.8)),
                "source": row.get("source", "seed"),
            })
            # Flush in batches of 100
            if len(batch) >= 100:
                try:
                    sb.table("commodity_aliases").upsert(
                        batch, on_conflict="alias_text,language,commodity_id"
                    ).execute()
                    inserted += len(batch)
                except Exception as exc:
                    print(f"[seed] alias batch upsert error: {exc}")
                    skipped += len(batch)
                batch = []

        # Remaining batch
        if batch:
            try:
                sb.table("commodity_aliases").upsert(
                    batch, on_conflict="alias_text,language,commodity_id"
                ).execute()
                inserted += len(batch)
            except Exception as exc:
                print(f"[seed] alias batch upsert error: {exc}")
                skipped += len(batch)

    print(f"[seed] Commodity aliases — inserted: {inserted}, skipped: {skipped}")
    return name_to_id


async def seed_corridors() -> int:
    """
    Seed the trade_corridors table from the CSV.

    Returns the number of rows inserted.
    """
    sb = get_client()
    csv_path = SEEDS_DIR / "trade_corridors.csv"

    if not csv_path.exists():
        print(f"[seed] Corridors CSV not found at {csv_path}")
        return 0

    rows: list[dict] = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "origin_region": row["origin_region"],
                "destination_region": row["destination_region"],
                "origin_state": row["origin_state"],
                "destination_state": row["destination_state"],
                "distance_km": int(row["distance_km"]),
                "typical_duration_hours": float(row["typical_duration_hours"]),
                "reliability_score": float(row.get("reliability_score", 0.7)),
            })

    if not rows:
        print("[seed] No corridor rows found in CSV.")
        return 0

    inserted = 0
    try:
        sb.table("trade_corridors").upsert(
            rows, on_conflict="origin_region,destination_region"
        ).execute()
        inserted = len(rows)
    except Exception as exc:
        # Fallback: insert row-by-row
        print(f"[seed] Corridor batch upsert error ({exc}). Trying row-by-row...")
        for r in rows:
            try:
                sb.table("trade_corridors").insert(r).execute()
                inserted += 1
            except Exception:
                pass

    print(f"[seed] Trade corridors — inserted: {inserted}")
    return inserted
