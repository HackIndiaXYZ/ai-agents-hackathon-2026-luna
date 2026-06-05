"""
TradeNexus API — Dispatch Router.

Endpoints for dispatch scoring, routes, and delay analytics.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from core.database import get_client
from agents.dispatch_agent import DispatchAgent

logger = logging.getLogger("dispatch_router")
router = APIRouter()
dispatch_agent = DispatchAgent()


class DelayReportRequest(BaseModel):
    origin: str = Field(..., description="Origin location (e.g. Nagpur)")
    destination: str = Field(..., description="Destination location (e.g. Mumbai)")
    delay_hours: float = Field(..., gt=0, description="Hours of delay experienced")
    reason: Optional[str] = Field(None, description="Optional delay reason")


@router.get("/score", summary="Calculate Corridor Route Score")
async def get_corridor_score(
    origin: str = Query(..., description="Origin location name (e.g. 'Nagpur')"),
    destination: str = Query(..., description="Destination location name (e.g. 'Mumbai')")
):
    """
    Score a route deterministically using Maps telemetry and database reports.
    """
    if not origin or not destination:
        raise HTTPException(
            status_code=400,
            detail="Both 'origin' and 'destination' query parameters must be supplied."
        )
    
    try:
        result = await dispatch_agent.score_corridor(origin, destination)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error scoring transport corridor: {str(e)}"
        )


@router.post("/report-delay", summary="Report a corridor delay")
async def report_corridor_delay(request: DelayReportRequest):
    """
    Log a crowd-sourced delay report for a transport corridor.
    Updates corridor reliability scoring for future route recommendations.
    """
    origin = request.origin.strip()
    destination = request.destination.strip()
    if not origin or not destination:
        raise HTTPException(status_code=400, detail="origin and destination are required")

    try:
        sb = get_client()
        corridor_id = None

        res = (
            sb.table("trade_corridors")
            .select("id")
            .ilike("origin_region", origin)
            .ilike("destination_region", destination)
            .limit(1)
            .execute()
        )
        if res.data:
            corridor_id = res.data[0]["id"]
        else:
            score = await dispatch_agent.score_corridor(origin, destination)
            insert_res = (
                sb.table("trade_corridors")
                .insert({
                    "origin_region": origin,
                    "destination_region": destination,
                    "origin_state": "Maharashtra",
                    "destination_state": "Maharashtra",
                    "distance_km": int(score.get("distance_km", 500)),
                    "typical_duration_hours": score.get("typical_hours", 10),
                    "reliability_score": score.get("confidence_score", 0.75),
                })
                .execute()
            )
            if insert_res.data:
                corridor_id = insert_res.data[0]["id"]

        report_row = {
            "corridor_id": corridor_id,
            "delay_hours": request.delay_hours,
            "reason": request.reason or "User-reported delay",
            "reported_at": datetime.now(timezone.utc).isoformat(),
        }
        report_res = sb.table("corridor_reports").insert(report_row).execute()

        try:
            sb.table("feedback_events").insert({
                "event_type": "route_report",
                "entity_type": "corridor",
                "original_value": f"{origin}→{destination}",
                "corrected_value": f"{request.delay_hours}h delay",
            }).execute()
        except Exception:
            pass

        updated_score = await dispatch_agent.score_corridor(origin, destination)
        return {
            "status": "logged",
            "report": report_res.data[0] if report_res.data else report_row,
            "corridor_score": updated_score,
            "message": "Delay report recorded. Route intelligence will reflect this in future scores.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error reporting delay: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/corridors", summary="List monitored corridors")
async def list_corridors():
    """Return known trade corridors with latest reliability scores."""
    try:
        sb = get_client()
        res = sb.table("trade_corridors").select("*").limit(50).execute()
        corridors = []
        for row in res.data or []:
            origin = row.get("origin_region", "")
            destination = row.get("destination_region", "")
            try:
                score = await dispatch_agent.score_corridor(origin, destination)
            except Exception:
                score = {
                    "distance_km": row.get("distance_km", 500),
                    "estimated_hours": row.get("typical_duration_hours", 10),
                    "confidence_score": row.get("reliability_score", 0.75),
                    "delay_risk": "medium",
                }
            corridors.append({
                "origin": origin,
                "destination": destination,
                "distance_km": score.get("distance_km", row.get("distance_km")),
                "typical_duration_hours": score.get("typical_hours", row.get("typical_duration_hours")),
                "reliability_score": score.get("confidence_score", row.get("reliability_score")),
                "delay_risk": score.get("delay_risk", "medium"),
            })
        return {"corridors": corridors, "count": len(corridors)}
    except Exception as e:
        logger.error("Error listing corridors: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
