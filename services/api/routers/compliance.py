"""
TradeNexus API — Compliance router.

Endpoints for regulatory compliance checks and documentation.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def check_compliance():
    """Check compliance status."""
    return {"message": "Compliance endpoints — coming soon"}
