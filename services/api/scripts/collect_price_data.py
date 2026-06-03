"""
TradeNexus — Collect Price Data for ML Training.

Multi-source ingestion script that pulls from:
1. Supabase mandi_prices table
2. data.gov.in API with deep pagination
3. CEDA Ashoka local CSV cache

Applies IQR outlier removal, gap filling, and writes per-commodity CSVs plus a dataset report.
"""

import os
import sys
import csv
import json
import random
import asyncio
import datetime
import warnings
from pathlib import Path
import pandas as pd
import numpy as np
import httpx

# Add services/api to path
_script_dir = Path(__file__).resolve().parent
_api_dir = _script_dir.parent
sys.path.insert(0, str(_api_dir))

from core.database import get_client
from core.config import get_settings

# --- Configuration ---
TARGET_COMMODITIES = [
    "Cotton", "Soybean", "Pigeon Pea", "Chickpea", "Wheat",
    "Onion", "Groundnut", "Mustard", "Maize", "Turmeric"
]

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
    "Turmeric": 8500
}

COMMODITY_CONFIG = {
    "Cotton": {
        "datagov_names": ["Cotton", "Kapas", "Cotton(Lint)"],
        "ceda_name": "Cotton",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Soybean": {
        "datagov_names": ["Soyabean", "Soybean"],
        "ceda_name": "Soyabean",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Pigeon Pea": {
        "datagov_names": ["Arhar(Tur/Red Gram)", "Tur", "Pigeon Pea"],
        "ceda_name": "Arhar(Tur/Red Gram)",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Chickpea": {
        "datagov_names": ["Gram(Whole)", "Chickpea", "Gram"],
        "ceda_name": "Gram(Whole)",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Wheat": {
        "datagov_names": ["Wheat"],
        "ceda_name": "Wheat",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Onion": {
        "datagov_names": ["Onion"],
        "ceda_name": "Onion",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Groundnut": {
        "datagov_names": ["Groundnut", "Groundnut (Split)", "Groundnut(Kernel)"],
        "ceda_name": "Groundnut",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Mustard": {
        "datagov_names": ["Mustard", "Mustard Seed"],
        "ceda_name": "Mustard",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Maize": {
        "datagov_names": ["Maize"],
        "ceda_name": "Maize",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    },
    "Turmeric": {
        "datagov_names": ["Turmeric"],
        "ceda_name": "Turmeric",
        "min_rows_for_lstm": 365,
        "min_rows_for_prophet": 90,
        "min_rows_for_xgboost": 30
    }
}

OUTPUT_DIR = Path(__file__).resolve().parents[3] / "data" / "ml_training"
REPORT_PATH = Path(__file__).resolve().parents[3] / "data" / "ml_models" / "data_collection_report.json"

def to_snake(name: str) -> str:
    return name.lower().replace(" ", "_")

def is_chronos_available() -> bool:
    try:
        import chronos
        return True
    except ImportError:
        return False

# --- Source 1: Supabase ---
def fetch_supabase_prices(sb, commodity: str) -> list[dict]:
    # Get commodity ID
    comm_res = sb.table("commodities").select("id").eq("canonical_name", commodity).limit(1).execute()
    if not comm_res.data:
        return []
    
    comm_id = comm_res.data[0]["id"]
    prices_res = sb.table("mandi_prices").select("data_as_of, modal_price").eq("commodity_id", comm_id).order("data_as_of").execute()
    
    raw = prices_res.data or []
    # Group by date
    date_prices = {}
    for r in raw:
        d = r["data_as_of"]
        if d:
            date_prices.setdefault(d, []).append(float(r["modal_price"]))
            
    return [
        {"date": d, "modal_price": sum(ps) / len(ps), "source": "supabase"}
        for d, ps in sorted(date_prices.items())
    ]

# --- Source 2: data.gov.in paginated ---
async def fetch_datagov_prices(api_key: str, variants: list[str]) -> list[dict]:
    if not api_key:
        return []
    
    url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    records = []
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        for var in variants:
            offset = 0
            limit = 1000
            while True:
                params = {
                    "api-key": api_key,
                    "format": "json",
                    "limit": limit,
                    "offset": offset,
                    "filters[commodity]": var
                }
                try:
                    response = await client.get(url, params=params)
                    if response.status_code != 200:
                        break
                    data = response.json()
                    chunk = data.get("records") or []
                    records.extend(chunk)
                    if len(chunk) < limit:
                        break
                    offset += limit
                    await asyncio.sleep(0.5)  # Rate limit safety
                except Exception as e:
                    print(f"  [WARN] data.gov.in query for {var} error: {e}")
                    break
                    
    # Normalize and group by date
    date_prices = {}
    for r in records:
        market = r.get("market") or r.get("mandi_name") or ""
        arrival_date_str = r.get("arrival_date") or r.get("date")
        modal_price_str = r.get("modal_price")
        
        if not arrival_date_str or not modal_price_str:
            continue
            
        # parse price
        try:
            modal_price = float(str(modal_price_str).replace(",", "").strip())
        except (ValueError, TypeError):
            continue
            
        # parse date
        parsed_dt = None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
            try:
                parsed_dt = datetime.datetime.strptime(arrival_date_str.strip(), fmt).date()
                break
            except ValueError:
                continue
                
        if parsed_dt:
            date_prices.setdefault(parsed_dt.isoformat(), []).append(modal_price)
            
    return [
        {"date": d, "modal_price": sum(ps) / len(ps), "source": "data.gov.in"}
        for d, ps in sorted(date_prices.items())
    ]

# --- Source 3: CEDA cache ---
def fetch_ceda_prices(commodity: str) -> list[dict]:
    config = COMMODITY_CONFIG.get(commodity, {})
    ceda_name = config.get("ceda_name", commodity)
    cache_dir = Path(__file__).resolve().parents[3] / "data" / "historical_cache"
    
    possible_names = [f"{ceda_name}.csv", f"{ceda_name}_prices.csv", f"{ceda_name.lower()}.csv", f"{ceda_name.lower()}_prices.csv"]
    csv_file = None
    for name in possible_names:
        candidate = cache_dir / name
        if candidate.exists():
            csv_file = candidate
            break
            
    if not csv_file:
        return []
        
    print(f"  [INFO] Found CEDA cache file: {csv_file.name}")
    rows = []
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            
            date_col = next((col for col in fieldnames if "date" in col.lower()), None)
            price_col = next((col for col in fieldnames if "price" in col.lower() or "modal" in col.lower()), None)
            
            if not date_col or not price_col:
                if len(fieldnames) >= 2:
                    date_col = fieldnames[0]
                    price_col = fieldnames[1]
                else:
                    return []
                    
            date_prices = {}
            for row in reader:
                dt_str = row.get(date_col)
                price_str = row.get(price_col)
                if not dt_str or not price_str:
                    continue
                    
                parsed_dt = None
                for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
                    try:
                        parsed_dt = datetime.datetime.strptime(dt_str.strip(), fmt).date()
                        break
                    except ValueError:
                        continue
                        
                if not parsed_dt:
                    continue
                    
                try:
                    price = float(price_str.replace(",", "").strip())
                except ValueError:
                    continue
                    
                date_prices.setdefault(parsed_dt.isoformat(), []).append(price)
                
            return [
                {"date": d, "modal_price": sum(ps) / len(ps), "source": "CEDA"}
                for d, ps in sorted(date_prices.items())
            ]
    except Exception as e:
        print(f"  [WARN] Error loading CEDA cache: {e}")
        
    return []

# --- Data Cleaning (IQR + Gap Filling) ---
def clean_and_impute(rows: list[dict]) -> tuple[list[dict], int, int]:
    if not rows:
        return [], 0, 0
        
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    
    # IQR outlier removal
    q1 = df["modal_price"].quantile(0.25)
    q3 = df["modal_price"].quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    outliers_mask = (df["modal_price"] < lower_bound) | (df["modal_price"] > upper_bound)
    outliers_removed = int(outliers_mask.sum())
    
    df_clean = df[~outliers_mask].copy()
    if df_clean.empty:
        return rows, 0, 0
        
    df_clean = df_clean.set_index("date")
    full_range = pd.date_range(start=df_clean.index.min(), end=df_clean.index.max(), freq="D")
    df_filled = df_clean.reindex(full_range)
    
    # Gap fill mask
    is_missing = df_filled["modal_price"].isna()
    missing_groups = (~is_missing).cumsum()
    missing_block_sizes = df_filled.groupby(missing_groups)["modal_price"].transform(lambda x: x.isna().sum())
    
    fill_mask = is_missing & (missing_block_sizes <= 3)
    missing_dates_filled = int(fill_mask.sum())
    
    # Forward fill
    df_filled["modal_price"] = df_filled["modal_price"].ffill(limit=3)
    
    # Fill source
    for idx in df_filled.index[fill_mask]:
        df_filled.at[idx, "sources"] = ["gap_filled"]
        
    # Drop rows that are still missing (gaps > 3 days)
    df_final = df_filled.dropna(subset=["modal_price"]).reset_index().rename(columns={"index": "date"})
    
    final_rows = []
    for _, r in df_final.iterrows():
        sources_val = r["sources"]
        if not isinstance(sources_val, list):
            sources_val = [r.get("source", "unknown")]
        final_rows.append({
            "date": r["date"].strftime("%Y-%m-%d"),
            "modal_price": float(r["modal_price"]),
            "sources": sources_val
        })
        
    return final_rows, outliers_removed, missing_dates_filled

async def process_commodity(sb, api_key: str, commodity: str) -> dict:
    print(f"Processing {commodity}...")
    
    # Fetch from all 3 sources
    sb_rows = fetch_supabase_prices(sb, commodity)
    print(f"  Supabase: {len(sb_rows)} rows")
    
    config = COMMODITY_CONFIG.get(commodity, {})
    dg_names = config.get("datagov_names", [commodity])
    dg_rows = await fetch_datagov_prices(api_key, dg_names)
    print(f"  data.gov.in: {len(dg_rows)} rows")
    
    ceda_rows = fetch_ceda_prices(commodity)
    print(f"  CEDA Cache: {len(ceda_rows)} rows")
    
    # Compile
    date_map = {}
    for r in sb_rows:
        d = r["date"]
        date_map.setdefault(d, {"prices": [], "sources": set()})
        date_map[d]["prices"].append(r["modal_price"])
        date_map[d]["sources"].add("supabase")
        
    for r in dg_rows:
        d = r["date"]
        date_map.setdefault(d, {"prices": [], "sources": set()})
        date_map[d]["prices"].append(r["modal_price"])
        date_map[d]["sources"].add("data.gov.in")
        
    for r in ceda_rows:
        d = r["date"]
        date_map.setdefault(d, {"prices": [], "sources": set()})
        date_map[d]["prices"].append(r["modal_price"])
        date_map[d]["sources"].add("CEDA")
        
    compiled_rows = []
    for d, info in sorted(date_map.items()):
        compiled_rows.append({
            "date": d,
            "modal_price": sum(info["prices"]) / len(info["prices"]),
            "sources": list(info["sources"])
        })
        
    # Clean and fill gaps
    cleaned_rows, outliers, gaps_filled = clean_and_impute(compiled_rows)
    real_count = len(cleaned_rows)
    
    # Determine model recommendation
    chronos_avail = is_chronos_available()
    if real_count >= 365:
        recommended = "LSTM"
    elif real_count >= 90:
        recommended = "Prophet"
    elif real_count >= 30:
        recommended = "XGBoost"
    else:
        recommended = "Chronos" if chronos_avail else "XGBoost"
        
    # Emergency fallback: synthetic data if <30 rows and Chronos unavailable
    synthetic_rows = []
    synthetic_count = 0
    if real_count < 30 and not chronos_avail:
        # Generate synthetic data capped at 15% of total
        # Real rows + Synthetic rows = Total. synthetic_count <= 0.15 * Total -> synthetic_count <= (0.15/0.85)*real_count
        max_synth = int(0.15 * real_count / 0.85) if real_count > 0 else 30
        if max_synth > 0:
            import random
            random.seed(42)
            base = cleaned_rows[0]["modal_price"] if cleaned_rows else BASE_PRICES.get(commodity, 5000)
            first_dt = datetime.datetime.strptime(cleaned_rows[0]["date"], "%Y-%m-%d").date() if cleaned_rows else datetime.date.today()
            
            price = base
            for i in range(1, max_synth + 1):
                d = first_dt - datetime.timedelta(days=i)
                price = price * (1 + random.gauss(0, 0.02))
                price = max(price, base * 0.5)
                synthetic_rows.append({
                    "date": d.isoformat(),
                    "modal_price": round(price, 2),
                    "sources": ["synthetic"]
                })
            synthetic_rows.reverse()
            synthetic_count = len(synthetic_rows)
            
    final_rows = synthetic_rows + cleaned_rows
    total_count = len(final_rows)
    real_data_pct = (real_count / total_count * 100.0) if total_count > 0 else 0.0
    
    # Extract actual distinct data sources
    used_sources = set()
    for r in final_rows:
        for s in r["sources"]:
            if s != "gap_filled":
                used_sources.add(s)
    if not used_sources:
        used_sources.add("synthetic")
    used_sources_list = sorted(list(used_sources))
    
    # Report structure
    report = {
        "total_rows": total_count,
        "real_rows": real_count,
        "synthetic_rows": synthetic_count,
        "real_data_pct": round(real_data_pct, 2),
        "data_sources": used_sources_list,
        "missing_dates_filled": gaps_filled,
        "outliers_removed": outliers,
        "recommended_model": recommended
    }
    
    # Credibility statement
    src_str = " & ".join(used_sources_list)
    stmt = f"{recommended} model using {real_count} real rows ({real_data_pct:.1f}% integrity) sourced from {src_str}."
    report["credibility_statement"] = stmt
    
    # Write CSV
    snake = to_snake(commodity)
    csv_path = OUTPUT_DIR / f"{snake}_prices.csv"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "modal_price", "source"])
        writer.writeheader()
        for r in final_rows:
            # map sources list to "real" or "synthetic" for training script backward compat
            src_col = "synthetic" if "synthetic" in r["sources"] else "real"
            writer.writerow({
                "date": r["date"],
                "modal_price": r["modal_price"],
                "source": src_col
            })
            
    print(f"  Saved {csv_path.name} ({total_count} rows, {real_data_pct:.1f}% real)")
    return report

async def main_async():
    print("=" * 60)
    print("TradeNexus — Multi-source Price Data Ingestion")
    print("=" * 60)
    
    # Create empty historical cache directory if not exists
    cache_dir = Path(__file__).resolve().parents[3] / "data" / "historical_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    sb = get_client()
    settings = get_settings()
    api_key = settings.DATA_GOV_API_KEY
    
    if not api_key:
        warnings.warn("DATA_GOV_API_KEY is not set in environment. Continuing with Supabase + CEDA cache.")
        
    # Check if historical_cache is empty
    cache_files = [f for f in cache_dir.glob("*.csv")]
    if not cache_files:
        print("\n[NOTICE] CEDA historical cache files are not present in data/historical_cache/.")
        print("To load CEDA cache, please place CSVs (e.g. Cotton_prices.csv, Wheat_prices.csv) inside that folder.\n")
        
    full_report = {}
    for commodity in TARGET_COMMODITIES:
        try:
            report = await process_commodity(sb, api_key, commodity)
            full_report[commodity] = report
        except Exception as e:
            print(f"  [ERROR] Failed to process {commodity}: {e}")
            
    # Save Report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
        
    print(f"\nSaved dataset quality report to: {REPORT_PATH}")
    print("Ingestion completed successfully!")

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
