"""
TradeNexus API — Dispatch Router.

Endpoints for dispatch scoring, routes, and delay analytics.
"""

from fastapi import APIRouter, Query, HTTPException
from agents.dispatch_agent import DispatchAgent

router = APIRouter()
dispatch_agent = DispatchAgent()


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
