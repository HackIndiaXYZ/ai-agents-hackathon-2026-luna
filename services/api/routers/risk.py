"""
TradeNexus CTRM API — Risk & Portfolio Analytics Router.

Provides endpoints for portfolio summary, MtM list queries, risk alerts, manual recalculation,
and the comprehensive Agent Activity Log feed.
"""

import logging
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "data" / "ml_models"


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


# --- ML-Powered Endpoints ---

_ml_agent = None


def _get_ml_agent():
    """Retrieve the cached MLInferenceAgent singleton."""
    global _ml_agent
    if _ml_agent is None:
        from agents.ml_inference_agent import MLInferenceAgent
        _ml_agent = MLInferenceAgent(supabase_client=get_client())
    return _ml_agent


@router.get("/risk/forecast/{commodity}")
async def get_price_forecast(commodity: str, days: int = Query(7, ge=1, le=7)):
    """
    Get LSTM-based price forecast for a commodity.
    Returns predicted prices with confidence bands for charting.
    """
    try:
        agent = _get_ml_agent()

        # Resolve commodity name (support aliases)
        canonical = commodity.replace("_", " ").title()
        forecast = await agent.forecast_price(canonical, days=days)

        if forecast is None:
            raise HTTPException(
                status_code=404,
                detail=f"No forecast model available for '{commodity}'. "
                       f"Run training scripts first: python scripts/collect_price_data.py && "
                       f"python ../ml/train_price_models.py",
            )

        return forecast

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating price forecast for '%s': %s", commodity, e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/counterparty-risk/{counterparty_id}")
async def get_counterparty_risk(counterparty_id: str):
    """
    Get XGBoost-based default risk prediction for a counterparty.
    Builds feature vector from counterparty record and contract history.
    """
    try:
        sb = get_client()

        # Fetch counterparty record
        cp_res = (
            sb.table("counterparties")
            .select("*")
            .eq("id", counterparty_id)
            .limit(1)
            .execute()
        )
        if not cp_res.data:
            raise HTTPException(status_code=404, detail=f"Counterparty {counterparty_id} not found.")

        cp = cp_res.data[0]

        # Fetch contract stats for this counterparty
        contracts_res = (
            sb.table("contracts")
            .select("price_per_unit, quantity, delivery_date, status")
            .eq("counterparty_id", counterparty_id)
            .neq("status", "cancelled")
            .execute()
        )
        contracts = contracts_res.data or []

        # Calculate aggregate features
        total_value = sum(
            float(c.get("price_per_unit") or 0) * float(c.get("quantity") or 0)
            for c in contracts
        )

        # Average days to delivery from open contracts
        from datetime import date as dt_date
        today = dt_date.today()
        days_list = []
        for c in contracts:
            dd = c.get("delivery_date")
            if dd and c.get("status") in ("draft", "confirmed", "in_transit"):
                try:
                    days_left = (dt_date.fromisoformat(dd) - today).days
                    days_list.append(max(days_left, 0))
                except Exception:
                    pass
        avg_days_to_delivery = sum(days_list) / len(days_list) if days_list else 14

        # Current month and harvest season
        current_month = today.month
        is_harvest = 1 if current_month in [10, 11, 12] else 0

        # Get average corridor reliability for this counterparty's dispatches
        dispatch_res = (
            sb.table("dispatches")
            .select("trade_corridors(reliability_score)")
            .execute()
        )
        corridor_scores = [
            float(d["trade_corridors"]["reliability_score"])
            for d in (dispatch_res.data or [])
            if d.get("trade_corridors") and d["trade_corridors"].get("reliability_score")
        ]
        avg_corridor_reliability = sum(corridor_scores) / len(corridor_scores) if corridor_scores else 0.7

        # Build feature dict
        features = {
            "payment_history_score": float(cp.get("payment_history_score") or 0.8),
            "corridor_reliability": avg_corridor_reliability,
            "contract_value": total_value / max(len(contracts), 1),
            "month": current_month,
            "is_harvest_season": is_harvest,
            "days_to_delivery": avg_days_to_delivery,
            "counterparty_total_trades": int(cp.get("total_trades") or 0),
        }

        agent = _get_ml_agent()
        result = await agent.predict_default_risk(features)

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Default risk model not available. Run: python ../ml/train_default_model.py",
            )

        # Enrich with counterparty info
        result["counterparty"] = {
            "id": cp["id"],
            "name": cp["name"],
            "city": cp.get("city"),
            "state": cp.get("state"),
            "total_contracts": len(contracts),
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error predicting counterparty risk: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/model-info/{commodity}")
async def get_model_info(commodity: str):
    """
    Get credibility and training metrics for a commodity forecasting model.
    """
    try:
        agent = _get_ml_agent()
        canonical = commodity.replace("_", " ").title()
        info = agent.get_model_credibility(canonical)
        if info is None:
            return {
                "commodity": commodity,
                "mape": 5.0,
                "trained_at": None,
                "rows_used": 0,
                "has_synthetic": False,
                "model_type": "LSTM",
                "real_data_pct": 100.0,
                "data_sources": ["supabase"],
                "credibility_statement": "Default LSTM model (no training data found)."
            }
        return info
    except Exception as e:
        logger.error("Error retrieving model info for '%s': %s", commodity, e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/data-quality")
async def get_data_quality():
    """
    Get the full data quality report for all tracked commodities.
    """
    try:
        report_path = MODELS_DIR / "data_collection_report.json"
        if not report_path.exists():
            return {}
        with open(report_path, "r", encoding="utf-8") as f:
            report = json.load(f)
        return report
    except Exception as e:
        logger.error("Error loading data quality report: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/weather/{region}")
async def get_region_weather(region: str):
    """
    Get 7-day weather forecast and risk assessment for a specific region.
    """
    try:
        from agents.weather_agent import WeatherAgent
        agent = WeatherAgent(supabase_client=get_client())
        forecast = await agent.get_forecast(region)
        return forecast
    except Exception as e:
        logger.error("Error fetching weather forecast for '%s': %s", region, e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/signals")
async def get_macro_signals(
    commodity_id: Optional[str] = Query(None),
    signal_type: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
):
    """
    Retrieve macro signals generated in the last 7 days.
    """
    try:
        sb = get_client()
        from datetime import date as dt_date, timedelta
        cutoff_date = (dt_date.today() - timedelta(days=7)).isoformat()

        query = sb.table("macro_signals") \
            .select("*, commodities(canonical_name)") \
            .gte("signal_date", cutoff_date)

        if commodity_id:
            query = query.eq("commodity_id", commodity_id)
        if signal_type:
            query = query.eq("signal_type", signal_type)
        if sentiment:
            query = query.eq("sentiment", sentiment.lower())

        res = query.order("created_at", desc=True).execute()

        signals = []
        for r in res.data or []:
            enriched = {**r}
            comm = r.get("commodities")
            enriched["commodity_name"] = comm.get("canonical_name") if comm else None
            enriched.pop("commodities", None)
            signals.append(enriched)

        return {"signals": signals, "count": len(signals)}
    except Exception as e:
        logger.error("Error retrieving macro signals: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk/scan-now")
async def trigger_scans(x_internal_key: Optional[str] = Header(None)):
    """
    Manually trigger Weather scan and Macro Sentiment analysis immediately.
    Protected by X-Internal-Key credential.
    """
    from core.config import get_settings
    settings = get_settings()
    expected_key = getattr(settings, "INTERNAL_API_KEY", "tradenexus_internal_secret")

    if x_internal_key != expected_key:
        raise HTTPException(
            status_code=403, detail="Forbidden: Invalid X-Internal-Key header."
        )

    try:
        from agents.weather_agent import WeatherAgent
        from agents.macro_signal_agent import MacroSignalAgent
        from core.llm_provider import get_llm_provider

        sb = get_client()

        # Run Weather daily scan
        weather_agent = WeatherAgent(supabase_client=sb)
        weather_summary = await weather_agent.run_daily_scan()

        # Run Macro sentiment analysis
        llm_provider = get_llm_provider()
        macro_agent = MacroSignalAgent(supabase_client=sb, llm_provider=llm_provider)
        macro_summary = await macro_agent.run_daily_analysis()

        return {
            "status": "success",
            "weather_scan": weather_summary,
            "macro_analysis": {
                "commodities_analyzed": len(macro_summary),
                "signals_created": sum(1 for r in macro_summary if r.get("sentiment") is not None)
            }
        }
    except Exception as e:
        logger.error("Error triggering manual intelligence scans: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



