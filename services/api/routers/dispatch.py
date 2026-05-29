"""
TradeNexus API — Dispatch router.

Endpoints for dispatch planning, route optimization, and logistics timing.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_dispatches():
    """List dispatch recommendations."""
    return {"message": "Dispatch endpoints — coming soon"}
