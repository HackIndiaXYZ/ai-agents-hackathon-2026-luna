"""
TradeNexus CTRM API — Risk & Portfolio Analytics Router.

Provides endpoints for portfolio summary, MtM list queries, risk alerts, manual recalculation,
and the comprehensive Agent Activity Log feed.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field

from core.database import get_client
from agents.risk_agent import RiskAgent

logger = logging.getLogger("risk_router")
logger.setLevel(logging.INFO)

router = APIRouter()

# --- Singleton Cache ---
_risk_agent: Optional[RiskAgent] = None


def _get_risk_agent() -> RiskAgent:
    """Retrieve the cached RiskAgent singleton."""
    global _risk_agent
    if _risk_agent is None:
        _risk_agent = RiskAgent(supabase_client=get_client())
    return _risk_agent


# --- Endpoints ---


@router.get("/risk/portfolio")
async def get_portfolio_summary():
    """
    Retrieve comprehensive CTRM portfolio risk details, including total value,
    unrealized P&L, exposures, and concentration warning flags.
    """
    try:
        agent = _get_risk_agent()
        summary = await agent.get_portfolio_summary()
        return summary
    except Exception as e:
        logger.error("Error retrieving portfolio summary: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/mtm")
async def get_mtm(
    commodity: Optional[str] = Query(
        None, description="Fuzzy commodity name or UUID to filter contracts"
    ),
    status: Optional[str] = Query(None, description="Filter contracts by status"),
):
    """
    Retrieve Mark-to-Market (MtM) details for open contracts.
    Sorted by unrealized P&L ascending (worst performing contracts first).
    """
    try:
        agent = _get_risk_agent()
        mtm_list = await agent.calculate_mtm()

        # Python-side filtering to support fuzzy alias resolutions
        filtered_list = []
        target_comm_id = None

        if commodity:
            is_uuid = False
            try:
                from uuid import UUID
                UUID(commodity)
                is_uuid = True
            except ValueError:
                is_uuid = False

            if not is_uuid:
                # Resolve fuzzy name using the CommodityAgent resolver
                from agents.commodity_agent import CommodityAgent
                from core.embedding_service import get_embedding_service
                from core.llm_provider import get_llm_provider

                comm_agent = CommodityAgent(
                    embedding_service=get_embedding_service(),
                    llm_provider=get_llm_provider(),
                    supabase_client=get_client(),
                )
                try:
                    res_comm = await comm_agent.resolve(commodity)
                    if res_comm:
                        target_comm_id = res_comm.commodity_id
                except Exception:
                    pass
            else:
                target_comm_id = commodity

        for item in mtm_list:
            # Commodity Filter
            if commodity:
                if target_comm_id:
                    if item.get("commodity_id") != target_comm_id:
                        continue
                else:
                    if commodity.lower() not in str(item.get("commodity", "")).lower():
                        continue

            # Status Filter
            if status:
                if item.get("status") != status:
                    continue

            filtered_list.append(item)

        # Sort by unrealized P&L ascending (worst first)
        filtered_list.sort(key=lambda x: float(x.get("unrealized_pnl") or 0))

        return {"contracts": filtered_list, "count": len(filtered_list)}

    except Exception as e:
        logger.error("Error retrieving MtM listings: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/alerts")
async def get_recent_alerts():
    """
    Retrieve automated risk alerts generated in the last 48 hours.
    """
    try:
        sb = get_client()
        cutoff_48h = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

        res = (
            sb.table("market_alerts")
            .select("*, commodities(canonical_name)")
            .eq("alert_type", "risk")
            .gte("created_at", cutoff_48h)
            .order("created_at", desc=True)
            .execute()
        )

        alerts = []
        for r in res.data or []:
            enriched = {**r}
            comm = r.get("commodities")
            enriched["commodity_name"] = comm.get("canonical_name") if comm else None
            enriched.pop("commodities", None)
            alerts.append(enriched)

        return {"alerts": alerts, "count": len(alerts)}

    except Exception as e:
        logger.error("Error retrieving recent alerts: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk/recalculate")
async def recalculate_risk(x_internal_key: Optional[str] = Header(None)):
    """
    Manually trigger a full risk cycle recalculation (MtM + Alerts).
    Protected by internal credential validation.
    """
    from core.config import get_settings

    settings = get_settings()
    expected_key = getattr(settings, "INTERNAL_API_KEY", "tradenexus_internal_secret")

    if x_internal_key != expected_key:
        raise HTTPException(
            status_code=403, detail="Forbidden: Invalid X-Internal-Key header."
        )

    try:
        agent = _get_risk_agent()
        result = await agent.run_full_cycle()
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error("Error executing risk recalculation cycle: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/activity")
async def get_agent_activity():
    """
    Fetch log activity across all agents from the last 24 hours.
    Powers the central Agent Activity Log feed on the dashboard.
    """
    try:
        sb = get_client()
        cutoff_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

        res = (
            sb.table("agent_activity_log")
            .select("*")
            .gte("created_at", cutoff_24h)
            .order("created_at", desc=True)
            .execute()
        )
        return {"activity_log": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        logger.error("Error retrieving agent activity logs: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
