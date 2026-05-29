"""
TradeNexus API — Market router.

Endpoints for market data, price discovery, and mandi intelligence.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_markets():
    """List available commodity markets."""
    return {"message": "Market endpoints — coming soon"}
