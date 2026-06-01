"""
TradeNexus — Lucy Demo Seeding Script.

Seeds the buyers database table with 30 realistic buyers and
the user_inventory table with 5 demo commodity stock items.
"""

import os
import sys
import csv
import asyncio
from pathlib import Path

# Add services/api to python path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from core.database import get_client


async def seed_buyers(sb) -> int:
    """Load buyers.csv and upsert into the buyers table."""
    csv_path = Path(__file__).resolve().parents[3] / "data" / "seeds" / "buyers.csv"
    if not csv_path.exists():
        print(f"[-] Buyers seed file not found at: {csv_path}")
        return 0

    print("[*] Seeding buyers database...")
    buyers = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse pipe-separated commodities list
            needs = row["commodities_needed"].split("|")
            buyers.append({
                "name": row["name"],
                "type": row["type"],
                "city": row["city"],
                "state": row["state"],
                "lat": float(row["lat"]) if row.get("lat") else None,
                "lng": float(row["lng"]) if row.get("lng") else None,
                "commodities_needed": needs,
                "typical_volume_quintals": int(row["typical_volume_quintals"]) if row.get("typical_volume_quintals") else None,
                "contact_placeholder": row.get("contact_placeholder", "Contact via TradeNexus"),
                "verified": row.get("verified", "false").lower() == "true"
            })

    inserted = 0
    # Clear existing to avoid duplicate demo data
    try:
        sb.table("buyers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as exc:
        print(f"[!] Warning: Clear existing buyers failed: {exc}")

    # Insert batch
    try:
        res = sb.table("buyers").insert(buyers).execute()
        inserted = len(res.data) if res.data else len(buyers)
        print(f"[+] Successfully seeded {inserted} buyers.")
    except Exception as exc:
        print(f"[-] Buyers batch insert failed: {exc}. Retrying row-by-row...")
        for b in buyers:
            try:
                sb.table("buyers").insert(b).execute()
                inserted += 1
            except Exception as e:
                print(f"[-] Row insert failed for {b['name']}: {e}")

    return inserted


async def seed_inventory(sb) -> int:
    """Load inventory.csv and upsert into the user_inventory table."""
    csv_path = Path(__file__).resolve().parents[3] / "data" / "seeds" / "inventory.csv"
    if not csv_path.exists():
        print(f"[-] Inventory seed file not found at: {csv_path}")
        return 0

    print("[*] Seeding demo user inventory...")
    
    # 1. Fetch canonical commodities to build name -> ID map
    res_comm = sb.table("commodities").select("id, canonical_name").execute()
    if not res_comm.data:
        print("[-] Commodities table is empty! Run standard seed first.")
        return 0
    
    comm_map = {c["canonical_name"].lower(): c["id"] for c in res_comm.data}
    
    # 2. Read inventory CSV
    inventory = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            comm_name = row["commodity_name"].strip().lower()
            comm_id = comm_map.get(comm_name)
            if not comm_id:
                print(f"[!] Warning: Commodity '{row['commodity_name']}' not found in DB master list. Skipping.")
                continue
            
            inventory.append({
                "commodity_id": comm_id,
                "quantity": float(row["quantity"]),
                "unit": row.get("unit", "quintal"),
                "notes": row.get("notes", "")
            })

    # Clear existing user inventory
    try:
        sb.table("user_inventory").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as exc:
        print(f"[!] Warning: Clear existing inventory failed: {exc}")

    # Upsert inventory rows
    inserted = 0
    for item in inventory:
        try:
            sb.table("user_inventory").upsert(item, on_conflict="commodity_id").execute()
            inserted += 1
        except Exception as e:
            print(f"[-] Inventory upsert failed for commodity ID {item['commodity_id']}: {e}")

    print(f"[+] Successfully seeded {inserted} inventory items.")
    return inserted


async def main():
    sb = get_client()
    try:
        print("=== LUCY DEMO SEED START ===")
        b_count = await seed_buyers(sb)
        i_count = await seed_inventory(sb)
        print(f"=== SEED COMPLETE | Buyers: {b_count} | Inventory: {i_count} ===")
    except Exception as e:
        print(f"[ERROR] Seeding process failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())
