"""
TradeNexus API — Market Router.

Endpoints for market data, price discovery, mandi intelligence, anomaly detection,
automatic alerting, and internal bulk price ingestion.
"""

from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from core.database import get_client
from core.llm_provider import get_llm_provider
from core.config import get_settings
from data_ingestion.datagov_client import DataGovClient
from agents.market_agent import MarketAgent
from agents.adaptive_agent import CommodityIntelligenceAgent

router = APIRouter()

# --- Cached singletons (avoid re-instantiating heavy objects per request) ---

_datagov_client: DataGovClient | None = None
_market_agent: MarketAgent | None = None
_adaptive_agent: CommodityIntelligenceAgent | None = None

def get_supabase():
    return get_client()

def get_datagov_client() -> DataGovClient:
    global _datagov_client
    if _datagov_client is None:
        _datagov_client = DataGovClient()
    return _datagov_client

def get_market_agent() -> MarketAgent:
    global _market_agent
    if _market_agent is None:
        _market_agent = MarketAgent(
            datagov_client=get_datagov_client(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client()
        )
    return _market_agent

def get_adaptive_agent() -> CommodityIntelligenceAgent:
    global _adaptive_agent
    if _adaptive_agent is None:
        _adaptive_agent = CommodityIntelligenceAgent()
    return _adaptive_agent

async def verify_internal_key(x_internal_key: str = Header(...)):
    """Verifies that the caller has the secret internal administrative key."""
    settings = get_settings()
    if not settings.INTERNAL_KEY or x_internal_key != settings.INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing X-Internal-Key."
        )
    return x_internal_key


# --- Endpoints ---

@router.get("/prices", status_code=status.HTTP_200_OK)
async def get_prices(
    commodity: str = Query(..., description="Name of the commodity (can be regional or canonical)"),
    state: Optional[str] = Query(None, description="Optional Indian state to filter prices"),
    language: Optional[str] = Query("en", description="Optional language parameter"),
    adaptive_agent: CommodityIntelligenceAgent = Depends(get_adaptive_agent),
    market_agent: MarketAgent = Depends(get_market_agent),
    supabase = Depends(get_supabase)
):
    """
    Get market pricing details for a commodity.
    Uses the 4-Tier Linguistic Resolution Cascade first to resolve regional name,
    then retrieves a complete deterministic summary and cognitive trading insights.
    """
    # 1. Resolve commodity to canonical name
    resolution = await adaptive_agent.resolve(commodity, language)
    canonical_name = resolution["canonical_name"]
    resolution_method = resolution["resolved_via"]

    # 2. Get commodity UUID from canonical name
    comm_res = supabase.table("commodities").select("id").eq("canonical_name", canonical_name).execute()
    if not comm_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Commodity '{canonical_name}' not found in database."
        )
    commodity_id = comm_res.data[0]["id"]

    # 3. Call market agent to fetch summary and insights
    summary = await market_agent.get_market_summary(commodity_id, language=language)

    # 4. Filter prices by state if provided
    prices = summary["prices"]
    if state:
        prices = [p for p in prices if p["state"].lower() == state.lower()]

    return {
        "resolution_method": resolution_method,
        "canonical_name": canonical_name,
        "prices": prices,
        "ai_summary": summary["ai_summary"],
        "alerts": summary["alerts"]
    }


@router.get("/alerts", status_code=status.HTTP_200_OK)
async def get_alerts(
    supabase = Depends(get_supabase)
):
    """
    Get the last 20 active market alerts.
    Includes resolved commodity canonical names.
    """
    # 1. Fetch active alerts ordered by created_at desc
    alerts_res = supabase.table("market_alerts") \
        .select("*") \
        .eq("is_active", True) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()
    
    alerts = alerts_res.data or []

    # 2. Map commodity names into records
    comm_ids = list({a["commodity_id"] for a in alerts if a.get("commodity_id")})
    if comm_ids:
        comm_res = supabase.table("commodities").select("id, canonical_name").in_("id", comm_ids).execute()
        comm_map = {c["id"]: c["canonical_name"] for c in comm_res.data}
    else:
        comm_map = {}

    for a in alerts:
        a["commodity_name"] = comm_map.get(a.get("commodity_id"), "Unknown")

    return alerts


@router.post("/ingest", status_code=status.HTTP_200_OK)
async def ingest_market_prices(
    commodity: Optional[str] = Query(None, description="Optional commodity name to ingest specifically"),
    internal_key: str = Depends(verify_internal_key),
    market_agent: MarketAgent = Depends(get_market_agent),
    adaptive_agent: CommodityIntelligenceAgent = Depends(get_adaptive_agent),
    supabase = Depends(get_supabase)
):
    """
    Protected internal administrative endpoint to trigger price ingestion,
    anomaly detection, and alerts generation.
    """
    resolved_commodity_name = None
    if commodity:
        # Resolve to canonical first
        resolution = await adaptive_agent.resolve(commodity)
        resolved_commodity_name = resolution["canonical_name"]

    # 1. Trigger ingest
    inserted_count = await market_agent.ingest_prices(resolved_commodity_name)

    # 2. Trigger anomaly detection
    if resolved_commodity_name:
        comm_res = supabase.table("commodities").select("id").eq("canonical_name", resolved_commodity_name).execute()
        if comm_res.data:
            commodity_id = comm_res.data[0]["id"]
            market_agent.detect_anomalies(commodity_id)
    else:
        # Ingested all, run detect_anomalies for all master commodities
        comm_res = supabase.table("commodities").select("id").execute()
        for c in comm_res.data:
            market_agent.detect_anomalies(c["id"])

    # 3. Trigger alert generation
    new_alerts = market_agent.generate_alerts()

    return {
        "status": "success",
        "inserted_prices_count": inserted_count,
        "generated_alerts_count": len(new_alerts)
    }


@router.get("/commodities", status_code=status.HTTP_200_OK)
async def list_commodities(
    supabase = Depends(get_supabase)
):
    """
    Get all 20 tracked commodities along with their alias counts per language.
    """
    # 1. Fetch all commodities
    comm_res = supabase.table("commodities").select("id, canonical_name, category, unit_of_measure").execute()
    commodities = comm_res.data or []

    # Filter by tracked 20 canonical commodities
    tracked_set = set(DataGovClient.TRACKED_COMMODITIES)
    tracked_commodities = [c for c in commodities if c["canonical_name"] in tracked_set]

    # 2. Fetch all aliases to aggregate languages
    alias_res = supabase.table("commodity_aliases").select("commodity_id, language").execute()
    aliases = alias_res.data or []

    # 3. Count languages per commodity
    counts = {}
    for a in aliases:
        c_id = a["commodity_id"]
        lang = a["language"]
        if c_id not in counts:
            counts[c_id] = {}
        counts[c_id][lang] = counts[c_id].get(lang, 0) + 1

    # 4. Construct final response
    output = []
    for c in tracked_commodities:
        c_id = c["id"]
        output.append({
            "id": c_id,
            "canonical_name": c["canonical_name"],
            "category": c["category"],
            "unit_of_measure": c["unit_of_measure"],
            "alias_counts": counts.get(c_id, {})
        })

    return output


# Demo MCX/NCDEX futures — exchange data licensing is expensive; seeded for demo.
_EXCHANGE_CONTRACTS = {
    "Cotton": {
        "mcx": {"symbol": "COTTONCANDY", "unit": "bale", "lot_size": 1},
        "ncdex": {"symbol": "KAPAS", "unit": "quintal", "lot_size": 10},
    },
    "Soybean": {
        "mcx": {"symbol": "SOYBEAN", "unit": "quintal", "lot_size": 10},
        "ncdex": {"symbol": "SOYBEAN", "unit": "quintal", "lot_size": 10},
    },
    "Wheat": {
        "mcx": {"symbol": "WHEAT", "unit": "quintal", "lot_size": 10},
        "ncdex": {"symbol": "WHEAT", "unit": "quintal", "lot_size": 10},
    },
    "Mustard": {
        "mcx": {"symbol": "RMSEED", "unit": "quintal", "lot_size": 10},
        "ncdex": {"symbol": "RMSEED", "unit": "quintal", "lot_size": 10},
    },
    "Chilli": {
        "mcx": {"symbol": "CHILLI", "unit": "quintal", "lot_size": 5},
        "ncdex": {"symbol": "CHILLI", "unit": "quintal", "lot_size": 5},
    },
    "Groundnut": {
        "mcx": {"symbol": "GROUNDNUT", "unit": "quintal", "lot_size": 10},
        "ncdex": {"symbol": "GROUNDNUT", "unit": "quintal", "lot_size": 10},
    },
}


@router.get("/exchange-prices", status_code=status.HTTP_200_OK)
async def get_exchange_prices(
    commodity: Optional[str] = Query(None, description="Filter by commodity name"),
    market_agent: MarketAgent = Depends(get_market_agent),
):
    """
    Demo MCX/NCDEX futures prices derived from mandi modal prices.
    Real exchange feeds require paid licensing — this endpoint is demo-seeded.
    """
    from datetime import datetime, timezone

    comm_res = get_client().table("commodities").select("id, canonical_name").execute()
    commodities = comm_res.data or []
    if commodity:
        commodities = [
            c for c in commodities
            if commodity.lower() in c["canonical_name"].lower()
        ]

    prices = []
    for c in commodities:
        name = c["canonical_name"]
        if name not in _EXCHANGE_CONTRACTS:
            continue
        try:
            summary = await market_agent.get_market_summary(c["id"])
            price_rows = summary.get("prices") or []
            modals = [float(p.get("modal_price") or 0) for p in price_rows if p.get("modal_price")]
            mandi_price = round(sum(modals) / len(modals), 2) if modals else 0
        except Exception:
            mandi_price = 5000 + (hash(name) % 3000)

        contracts = _EXCHANGE_CONTRACTS[name]
        for exchange, meta in contracts.items():
            basis = 1.02 if exchange == "mcx" else 0.98
            futures_price = round(mandi_price * basis, 2)
            prices.append({
                "exchange": exchange.upper(),
                "commodity": name,
                "symbol": meta["symbol"],
                "last_price": futures_price,
                "change_pct": round((hash(f"{name}{exchange}") % 400 - 200) / 100, 2),
                "unit": meta["unit"],
                "lot_size": meta["lot_size"],
                "expiry": "Near month",
                "source": "demo_derived_from_mandi",
                "mandi_reference_price": mandi_price,
            })

    return {
        "prices": prices,
        "count": len(prices),
        "demo_mode": True,
        "disclaimer": "MCX/NCDEX prices are demo-derived from mandi modal prices. Not for trading.",
        "as_of": datetime.now(timezone.utc).isoformat(),
    }
