"""
TradeNexus API — Opportunity router.

Endpoints for identifying profitable trade opportunities and arbitrage.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_opportunities():
    """List current trade opportunities."""
    return {"message": "Opportunity endpoints — coming soon"}
