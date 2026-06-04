"""
TradeNexus API — Supply Chain Network Router.

Provides endpoints for D3 network graph visualization.
Aggregates user inventory, counterparty, mandi nodes and link exposures from contracts, dispatches, and opportunities.
"""

import logging
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException
from core.database import get_client

logger = logging.getLogger("network_router")
logger.setLevel(logging.INFO)

router = APIRouter()

# Coordinate mappings for regional hubs / commodities
COORDINATES = {
    # Commodities / Hubs
    "cotton": (21.15, 79.09),       # Nagpur
    "soybean": (22.72, 75.86),      # Indore
    "wheat": (26.85, 80.95),        # Lucknow
    "onion": (19.99, 73.79),        # Nashik / Azadpur
    "chilli": (16.30, 80.44),       # Guntur
    "groundnut": (22.30, 70.80),    # Rajkot
    "mustard": (27.21, 77.49),      # Bharatpur
    "pigeon pea": (17.32, 76.83),    # Kalaburagi
    
    # Major Cities
    "nagpur": (21.15, 79.09),
    "mumbai": (19.07, 72.87),
    "indore": (22.72, 75.86),
    "ahmedabad": (23.02, 72.57),
    "lucknow": (26.85, 80.95),
    "delhi": (28.70, 77.17),
    "azadpur": (28.70, 77.17),
    "chennai": (13.08, 80.27),
    "guntur": (16.30, 80.44),
    "jaipur": (26.91, 75.78),
    "nashik": (19.99, 73.79),
    "hubli": (15.36, 75.12),
    "nizamabad": (18.67, 78.10),
    "rajkot": (22.30, 70.80),
    "patna": (25.59, 85.13),
    "kolkata": (22.57, 88.36),
    "ludhiana": (30.90, 75.85),
    "pune": (18.52, 73.85),
    "bengaluru": (12.97, 77.59),
    "madurai": (9.92, 78.11),
    "kochi": (9.93, 76.27),
    "amravati": (20.93, 77.75),
    "bhopal": (23.25, 77.41),
    "yavatmal": (20.38, 78.12)
}

def get_coords(name: str, fallback_lat: float = 21.0, fallback_lng: float = 78.0) -> tuple:
    """Helper to resolve latitude and longitude from location name."""
    clean_name = str(name).lower().strip()
    # Match direct key
    if clean_name in COORDINATES:
        return COORDINATES[clean_name]
    # Fuzzy match inside key
    for key, val in COORDINATES.items():
        if key in clean_name or clean_name in key:
            return val
    # Deterministic fallback based on name hash to prevent overlapping nodes
    h = hash(clean_name)
    lat = fallback_lat + ((h % 100) - 50) / 45.0
    lng = fallback_lng + (((h >> 3) % 100) - 50) / 45.0
    return round(lat, 4), round(lng, 4)

@router.get("/network/graph", summary="Retrieve supply chain network graph data")
async def get_network_graph():
    """
    Aggregates user_inventory nodes, counterparties, mandi prices,
    and returns a D3-ready list of nodes and links.
    """
    sb = get_client()
    nodes = []
    links = []
    
    # Keep track of added node IDs to prevent duplicates
    node_ids = set()

    try:
        # 1. Fetch user_inventory nodes
        inv_res = sb.table("user_inventory").select("id, quantity, commodities(canonical_name)").execute()
        if inv_res.data:
            for item in inv_res.data:
                commodity_name = item.get("commodities", {}).get("canonical_name", "Cotton")
                node_id = f"inv-{commodity_name.lower().replace(' ', '_')}"
                lat, lng = get_coords(commodity_name)
                
                if node_id not in node_ids:
                    nodes.append({
                        "id": node_id,
                        "type": "inventory",
                        "name": f"{commodity_name} Stock",
                        "value": float(item.get("quantity", 0)),
                        "commodity": commodity_name,
                        "lat": lat,
                        "lng": lng
                    })
                    node_ids.add(node_id)
        
        # 2. Fetch counterparties
        cp_res = sb.table("counterparties").select("id, name, type, city, gstin, credit_limit, total_trades").execute()
        if cp_res.data:
            for cp in cp_res.data:
                node_id = f"cp-{cp['id']}"
                lat, lng = get_coords(cp['city'])
                
                if node_id not in node_ids:
                    nodes.append({
                        "id": node_id,
                        "type": "buyer" if cp['type'] != 'seller' else 'seller',
                        "name": cp['name'],
                        "value": float(cp.get("credit_limit", 500000) or 500000),
                        "commodity": None,
                        "lat": lat,
                        "lng": lng
                    })
                    node_ids.add(node_id)

        # 3. Fetch Mandis
        mandi_res = sb.table("mandi_prices").select("mandi_name, state, modal_price, commodities(canonical_name)").execute()
        if mandi_res.data:
            # Aggregate to get unique mandis
            unique_mandis = {}
            for p in mandi_res.data:
                mandi_name = p.get("mandi_name")
                commodity_name = p.get("commodities", {}).get("canonical_name", "")
                if not mandi_name:
                    continue
                key = (mandi_name.lower(), commodity_name.lower())
                if key not in unique_mandis:
                    unique_mandis[key] = p
            
            for key, mandi in unique_mandis.items():
                mandi_name = mandi["mandi_name"]
                commodity_name = mandi.get("commodities", {}).get("canonical_name", "")
                node_id = f"mandi-{mandi_name.lower().replace(' ', '_')}"
                lat, lng = get_coords(mandi_name)
                
                if node_id not in node_ids:
                    nodes.append({
                        "id": node_id,
                        "type": "mandi",
                        "name": f"{mandi_name} Mandi",
                        "value": float(mandi.get("modal_price", 0)),
                        "commodity": commodity_name,
                        "lat": lat,
                        "lng": lng
                    })
                    node_ids.add(node_id)

        # 4. Fetch links from Contracts
        contracts_res = sb.table("contracts").select(
            "id, contract_number, type, quantity, price_per_unit, status, counterparty_id, commodities(canonical_name)"
        ).execute()
        
        # We need latest PnL snapshot values to color contracts
        pnl_res = sb.table("pnl_snapshots").select("contract_id, unrealized_pnl").order("created_at", desc=True).execute()
        pnl_map = {}
        if pnl_res.data:
            for p in pnl_res.data:
                c_id = p["contract_id"]
                if c_id not in pnl_map:
                    pnl_map[c_id] = float(p["unrealized_pnl"])

        if contracts_res.data:
            for c in contracts_res.data:
                commodity_name = c.get("commodities", {}).get("canonical_name", "Cotton")
                inv_node_id = f"inv-{commodity_name.lower().replace(' ', '_')}"
                cp_node_id = f"cp-{c['counterparty_id']}"
                
                # Check if these nodes exist in our node list
                if inv_node_id in node_ids and cp_node_id in node_ids:
                    val = float(c.get("quantity", 0)) * float(c.get("price_per_unit", 0) or 1)
                    pnl_val = pnl_map.get(c["id"], 0.0)
                    
                    if c["type"] == "buy":
                        source = cp_node_id
                        target = inv_node_id
                    else:
                        source = inv_node_id
                        target = cp_node_id
                        
                    links.append({
                        "source": source,
                        "target": target,
                        "type": "contract",
                        "value": val,
                        "status": c["status"],
                        "pnl": pnl_val
                    })

        # 5. Fetch links from Active Dispatches
        disp_res = sb.table("dispatches").select(
            "id, dispatch_number, contract_id, dispatched_quantity, destination, status, contracts(commodity_id, commodities(canonical_name))"
        ).execute()
        if disp_res.data:
            for d in disp_res.data:
                contract = d.get("contracts") or {}
                commodity_name = contract.get("commodities", {}).get("canonical_name", "Cotton")
                inv_node_id = f"inv-{commodity_name.lower().replace(' ', '_')}"
                dest_mandi_id = f"mandi-{d['destination'].lower().replace(' ', '_')}"
                
                # Ensure target mandi node exists
                if dest_mandi_id not in node_ids:
                    lat, lng = get_coords(d['destination'])
                    nodes.append({
                        "id": dest_mandi_id,
                        "type": "mandi",
                        "name": f"{d['destination']} APMC",
                        "value": 4500.0,
                        "commodity": commodity_name,
                        "lat": lat,
                        "lng": lng
                    })
                    node_ids.add(dest_mandi_id)
                
                if inv_node_id in node_ids:
                    links.append({
                        "source": inv_node_id,
                        "target": dest_mandi_id,
                        "type": "dispatch",
                        "value": float(d.get("dispatched_quantity", 0)),
                        "status": d["status"],
                        "pnl": 0.0
                    })

        # 6. Fetch links from Opportunities
        opp_res = sb.table("trade_opportunities").select("id, origin, destination, quantity, commodities(canonical_name)").execute()
        if opp_res.data:
            for o in opp_res.data:
                commodity_name = o.get("commodities", {}).get("canonical_name", "Cotton")
                src_mandi_id = f"mandi-{o['origin'].lower().replace(' ', '_')}"
                dest_mandi_id = f"mandi-{o['destination'].lower().replace(' ', '_')}"
                
                # Ensure nodes exist
                for m_id, name in [(src_mandi_id, o['origin']), (dest_mandi_id, o['destination'])]:
                    if m_id not in node_ids:
                        lat, lng = get_coords(name)
                        nodes.append({
                            "id": m_id,
                            "type": "mandi",
                            "name": f"{name} APMC",
                            "value": 4000.0,
                            "commodity": commodity_name,
                            "lat": lat,
                            "lng": lng
                        })
                        node_ids.add(m_id)
                
                links.append({
                    "source": src_mandi_id,
                    "target": dest_mandi_id,
                    "type": "opportunity",
                    "value": float(o.get("quantity", 100)),
                    "status": "open",
                    "pnl": 0.0
                })

    except Exception as exc:
        logger.error("Error gathering network graph data: %s", exc, exc_info=True)
        # Endpoint should not crash, return fallback
        pass

    # If there is insufficient database data, return a default mock graph
    if not nodes:
        return get_fallback_graph()

    return {"nodes": nodes, "links": links}

def get_fallback_graph() -> Dict[str, Any]:
    """Fallback network graph data mirroring DEMO_GRAPH in case DB query yields nothing."""
    return {
        "nodes": [
            { "id": "inv-cotton", "type": "inventory", "name": "Cotton Stock", "value": 600, "commodity": "Cotton", "lat": 21.15, "lng": 79.09 },
            { "id": "inv-soybean", "type": "inventory", "name": "Soybean Stock", "value": 120, "commodity": "Soybean", "lat": 22.72, "lng": 75.86 },
            { "id": "inv-wheat", "type": "inventory", "name": "Wheat Stock", "value": 150, "commodity": "Wheat", "lat": 26.85, "lng": 80.95 },
            { "id": "inv-onion", "type": "inventory", "name": "Onion Stock", "value": 200, "commodity": "Onion", "lat": 19.99, "lng": 73.79 },
            { "id": "cp-ramesh", "type": "buyer", "name": "Ramesh Cotton Traders", "value": 832000, "commodity": "Cotton", "lat": 21.15, "lng": 79.09 },
            { "id": "cp-balaji", "type": "buyer", "name": "Balaji Agro Industries", "value": 840000, "commodity": "Groundnut", "lat": 23.02, "lng": 72.57 },
            { "id": "cp-guntur", "type": "buyer", "name": "Guntur Chilli Exporters", "value": 1520000, "commodity": "Chilli", "lat": 16.30, "lng": 80.44 },
            { "id": "cp-saikrupa", "type": "buyer", "name": "Sai Kripa Warehousing", "value": 660000, "commodity": "Onion", "lat": 28.64, "lng": 77.21 },
            { "id": "cp-vikas", "type": "buyer", "name": "Vikas Grain Co.", "value": 1351000, "commodity": "Soybean", "lat": 22.72, "lng": 75.86 },
            { "id": "mandi-nagpur", "type": "mandi", "name": "Nagpur Mandi", "value": 7250, "commodity": "Cotton", "lat": 21.15, "lng": 79.09 },
            { "id": "mandi-indore", "type": "mandi", "name": "Indore APMC", "value": 4800, "commodity": "Soybean", "lat": 22.72, "lng": 75.86 },
            { "id": "mandi-azadpur", "type": "mandi", "name": "Azadpur Mandi", "value": 2400, "commodity": "Onion", "lat": 28.70, "lng": 77.17 },
            { "id": "mandi-guntur", "type": "mandi", "name": "Guntur Market", "value": 18500, "commodity": "Chilli", "lat": 16.30, "lng": 80.44 },
            { "id": "mandi-rajkot", "type": "mandi", "name": "Rajkot Mandi", "value": 6900, "commodity": "Groundnut", "lat": 22.30, "lng": 70.80 },
            { "id": "mandi-lucknow", "type": "mandi", "name": "Lucknow Grain Hub", "value": 2450, "commodity": "Wheat", "lat": 26.85, "lng": 80.95 }
        ],
        "links": [
            { "source": "inv-cotton", "target": "cp-ramesh", "type": "contract", "value": 320000, "status": "confirmed", "pnl": 20000 },
            { "source": "inv-cotton", "target": "cp-ramesh", "type": "contract", "value": 520000, "status": "confirmed", "pnl": 24000 },
            { "source": "inv-soybean", "target": "cp-vikas", "type": "contract", "value": 735000, "status": "in_transit", "pnl": -15000 },
            { "source": "inv-onion", "target": "cp-saikrupa", "type": "contract", "value": 660000, "status": "confirmed", "pnl": -60000 },
            { "source": "cp-guntur", "target": "inv-cotton", "type": "contract", "value": 1520000, "status": "draft", "pnl": -40000 },
            { "source": "inv-cotton", "target": "mandi-nagpur", "type": "dispatch", "value": 50, "status": "in_transit", "pnl": 0 },
            { "source": "inv-soybean", "target": "mandi-indore", "type": "dispatch", "value": 150, "status": "in_transit", "pnl": 0 },
            { "source": "mandi-nagpur", "target": "cp-ramesh", "type": "opportunity", "value": 120, "status": "open", "pnl": 0 },
            { "source": "mandi-rajkot", "target": "cp-balaji", "type": "opportunity", "value": 80, "status": "open", "pnl": 0 },
            { "source": "mandi-lucknow", "target": "inv-wheat", "type": "contract", "value": 490000, "status": "settled", "pnl": -20000 },
            { "source": "cp-balaji", "target": "mandi-rajkot", "type": "contract", "value": 840000, "status": "delivered", "pnl": 12000 },
            { "source": "cp-vikas", "target": "mandi-indore", "type": "opportunity", "value": 250, "status": "open", "pnl": 0 }
        ]
    }
