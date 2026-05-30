"""
TradeNexus API — Trade Advisor Router.

Exposes the unified advisory recommendation endpoint `/api/v1/advisor/recommend`.
Coordinates between the client and TradeAdvisorAgent.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from agents.trade_advisor_agent import TradeAdvisorAgent

router = APIRouter()
advisor_agent = TradeAdvisorAgent()


@router.get("/recommend", summary="Generate Synthesized Corridor Trade Recommendation")
async def get_recommendation(
    query: str = Query(..., description="Regional or canonical commodity search term (e.g. 'Kapas', 'Wheat')"),
    origin: str = Query(..., description="Origin mandi city name (e.g. 'Nagpur')"),
    destination: str = Query(..., description="Destination mandi city name (e.g. 'Ahmedabad')"),
    language: Optional[str] = Query("en", description="Target language code (e.g. 'hi', 'gu', 'mr')")
):
    """
    Unified endpoint executing the linguistic cascade and full multi-agent corridor analysis
    to return a single synthesized executive recommendation.
    """
    if not query or not origin or not destination:
        raise HTTPException(
            status_code=400,
            detail="Missing required parameters. 'query', 'origin', and 'destination' must be supplied."
        )

    try:
        recommendation = await advisor_agent.generate_recommendation(
            query=query, origin=origin, destination=destination, language=language
        )
        return recommendation
    except Exception as e:
        print(f"[AdvisorRouter] Exception during recommendation assembly: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal agent execution error: {str(e)}"
        )
