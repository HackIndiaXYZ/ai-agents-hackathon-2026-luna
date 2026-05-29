"""
TradeNexus API — Feedback router.

Endpoints for user feedback, alias corrections, and adaptive learning signals.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/")
async def submit_feedback():
    """Submit user feedback for adaptive learning."""
    return {"message": "Feedback endpoints — coming soon"}
