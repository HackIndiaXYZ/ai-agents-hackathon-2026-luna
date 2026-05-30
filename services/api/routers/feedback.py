"""
TradeNexus API — Feedback Router.

Endpoints for user alias corrections, alert feedback, and resolution
analytics.  These power the dashboard "Learning Activity" widget and
close the Adaptive Data feedback loop.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from core.database import get_client
from core.embedding_service import get_embedding_service
from core.llm_provider import get_llm_provider
from agents.commodity_agent import CommodityAgent

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class CorrectionRequest(BaseModel):
    original_text: str = Field(..., description="The user's original input text")
    corrected_canonical: str = Field(..., description="The correct canonical commodity name")
    language: str = Field("en", description="Language of the original input")


class AlertFeedbackRequest(BaseModel):
    alert_id: str = Field(..., description="UUID of the market alert")
    is_positive: bool = Field(..., description="True if the alert was helpful")


# ---------------------------------------------------------------------------
# Singleton dependency
# ---------------------------------------------------------------------------

_commodity_agent: CommodityAgent | None = None


def get_commodity_agent() -> CommodityAgent:
    global _commodity_agent
    if _commodity_agent is None:
        _commodity_agent = CommodityAgent(
            embedding_service=get_embedding_service(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client(),
        )
    return _commodity_agent


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/correction", status_code=status.HTTP_200_OK)
async def submit_correction(
    body: CorrectionRequest,
    agent: CommodityAgent = Depends(get_commodity_agent),
):
    """
    Accept a user correction mapping ``original_text`` → ``corrected_canonical``.

    The system immediately:
    1. Upserts the alias with ``source='user'`` and ``confidence=0.95``
    2. Indexes the embedding for instant Tier-3 retrieval
    3. Logs to ``feedback_events`` for the Adaptive Data pipeline
    """
    result = await agent.process_correction(
        original_text=body.original_text,
        corrected_canonical=body.corrected_canonical,
        language=body.language,
    )

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    return {
        **result,
        "message": "System updated. This alias will now resolve instantly.",
    }


@router.post("/alert", status_code=status.HTTP_200_OK)
async def submit_alert_feedback(body: AlertFeedbackRequest):
    """
    Record whether a market alert was helpful (thumbs-up / thumbs-down).

    Logged to ``feedback_events`` for model quality monitoring.
    """
    sb = get_client()
    try:
        sb.table("feedback_events").insert({
            "event_type": "alert_feedback",
            "entity_type": "market_alert",
            "entity_id": body.alert_id,
            "is_positive": body.is_positive,
        }).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log alert feedback: {exc}",
        )

    return {
        "status": "recorded",
        "alert_id": body.alert_id,
        "is_positive": body.is_positive,
    }


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats(
    agent: CommodityAgent = Depends(get_commodity_agent),
):
    """
    Return resolution analytics.

    Powers the "Learning Activity" widget on the dashboard:
    tier breakdown, corrections this week, language coverage, etc.
    """
    return await agent.get_resolution_stats()
