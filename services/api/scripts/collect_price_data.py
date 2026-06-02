"""
TradeNexus — Collect Price Data for ML Training.

Standalone script that pulls price history from the mandi_prices table
and saves per-commodity CSVs for LSTM model training.
Generates synthetic data for commodities with insufficient history.

Usage:
    cd services/api
    python scripts/collect_price_data.py
"""

import os
import sys
import csv
import random
from datetime import date, timedelta
from pathlib import Path

# Add the services/api directory to path for imports
_script_dir = Path(__file__).resolve().parent
_api_dir = _script_dir.parent
sys.path.insert(0, str(_api_dir))

from core.database import get_client

# --- Configuration ---

TARGET_COMMODITIES = [
    "Cotton", "Soybean", "Pigeon Pea", "Chickpea", "Wheat",
    "Onion", "Groundnut", "Mustard", "Maize", "Turmeric",
]

# Base prices per commodity for synthetic generation (₹/quintal)
BASE_PRICES = {
    "Cotton": 7200,
    "Soybean": 4800,
    "Pigeon Pea": 6500,
    "Chickpea": 5200,
    "Wheat": 2400,
    "Onion": 1800,
    "Groundnut": 5600,
    "Mustard": 5100,
    "Maize": 2100,
    "Turmeric": 8500,
}

MIN_REAL_ROWS = 30
SYNTHETIC_DAYS = 180

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "ml_training"


def to_snake(name: str) -> str:
    """Convert commodity name to snake_case."""
    return name.lower().replace(" ", "_")


def generate_synthetic_prices(base_price: float, days: int = 180) -> list[dict]:
    """
    Generate synthetic but realistic daily price data using geometric random walk.
    price[t] = price[t-1] × (1 + N(0, 0.02))
    """
    random.seed(42)  # Reproducible
    today = date.today()
    prices = []
    price = base_price

    # Generate backward from today
    for i in range(days, 0, -1):
        d = today - timedelta(days=i)
        price = price * (1 + random.gauss(0, 0.02))
        price = max(price, base_price * 0.5)  # Floor at 50% of base
        prices.append({
            "date": d.isoformat(),
            "modal_price": round(price, 2),
            "source": "synthetic",
        })

    return prices


def collect_for_commodity(sb, commodity: str) -> dict:
    """Fetch real prices for a commodity and supplement with synthetic if needed."""
    # 1. Resolve commodity ID
    comm_res = (
        sb.table("commodities")
        .select("id")
        .eq("canonical_name", commodity)
        .limit(1)
        .execute()
    )
    if not comm_res.data:
        print(f"  [WARN] Commodity '{commodity}' not found in DB - generating fully synthetic data")
        return {"real": 0, "synthetic": SYNTHETIC_DAYS, "rows": generate_synthetic_prices(BASE_PRICES.get(commodity, 5000))}

    comm_id = comm_res.data[0]["id"]

    # 2. Query aggregated daily prices
    # Supabase doesn't support GROUP BY in REST API, so we fetch all and aggregate in Python
    prices_res = (
        sb.table("mandi_prices")
        .select("data_as_of, modal_price")
        .eq("commodity_id", comm_id)
        .order("data_as_of")
        .execute()
    )

    raw_rows = prices_res.data or []

    # Aggregate by date (average modal_price per day)
    date_prices: dict[str, list[float]] = {}
    for row in raw_rows:
        d = row["data_as_of"]
        date_prices.setdefault(d, []).append(float(row["modal_price"]))

    real_rows = [
        {"date": d, "modal_price": round(sum(ps) / len(ps), 2), "source": "real"}
        for d, ps in sorted(date_prices.items())
    ]

    real_count = len(real_rows)
    synthetic_count = 0

    # 3. Supplement with synthetic if needed
    if real_count < MIN_REAL_ROWS:
        last_price = real_rows[-1]["modal_price"] if real_rows else BASE_PRICES.get(commodity, 5000)
        synthetic_rows = generate_synthetic_prices(last_price, SYNTHETIC_DAYS)
        synthetic_count = len(synthetic_rows)

        # Merge: synthetic first, then real (chronological)
        # Filter synthetic to only dates before first real date
        if real_rows:
            first_real_date = real_rows[0]["date"]
            synthetic_rows = [s for s in synthetic_rows if s["date"] < first_real_date]
            synthetic_count = len(synthetic_rows)

        all_rows = synthetic_rows + real_rows
    else:
        all_rows = real_rows

    return {"real": real_count, "synthetic": synthetic_count, "rows": all_rows}


def main():
    print("=" * 60)
    print("TradeNexus — ML Training Data Collection")
    print("=" * 60)

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sb = get_client()

    for commodity in TARGET_COMMODITIES:
        snake = to_snake(commodity)
        result = collect_for_commodity(sb, commodity)

        # Write CSV
        csv_path = OUTPUT_DIR / f"{snake}_prices.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["date", "modal_price", "source"])
            writer.writeheader()
            writer.writerows(result["rows"])

        total = len(result["rows"])
        print(f"  Collected {result['real']} real rows, {result['synthetic']} synthetic rows for {commodity} -> {csv_path.name} ({total} total)")

    print(f"\nAll CSVs saved to: {OUTPUT_DIR}")
    print("Done!")


if __name__ == "__main__":
    main()
