"""
TradeNexus API — Counterparties Router.

REST endpoints for counterparty management and risk assessment.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core.database import get_client
from agents.counterparty_agent import CounterpartyAgent

logger = logging.getLogger("counterparties_router")
logger.setLevel(logging.INFO)

router = APIRouter()


# --- Request Models ---


class CounterpartyCreateRequest(BaseModel):
    name: str = Field(..., description="Counterparty name")
    city: str = Field(..., description="City location")
    state: str = Field(..., description="State location")
    type: str = Field("both", description="Counterparty type: 'buyer', 'seller', or 'both'")
    gstin: Optional[str] = Field(None, description="GST identification number")
    pan: Optional[str] = Field(None, description="PAN card number")
    contact_name: Optional[str] = Field(None, description="Primary contact name")
    contact_phone: Optional[str] = Field(None, description="Primary contact phone number")
    credit_limit: float = Field(0, description="Credit limit in Rupees, defaults to 0")

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Ramesh Enterprises",
                "city": "Nagpur",
                "state": "Maharashtra",
                "type": "buyer",
                "gstin": "27AAAAA1111A1Z1",
                "pan": "ABCDE1234F",
                "contact_name": "Ramesh Sharma",
                "contact_phone": "+919876543210",
                "credit_limit": 500000.0
            }
        }
    }


# --- Singleton Agent Cache ---


_counterparty_agent: Optional[CounterpartyAgent] = None


def _get_counterparty_agent() -> CounterpartyAgent:
    global _counterparty_agent
    if _counterparty_agent is None:
        _counterparty_agent = CounterpartyAgent(supabase_client=get_client())
    return _counterparty_agent


# --- Endpoints ---


@router.get("/counterparties")
async def list_counterparties(
    type: Optional[str] = Query(None, description="Filter by type: buyer, seller, both"),
):
    """List all counterparties with risk level and total contract value."""
    try:
        agent = _get_counterparty_agent()
        counterparties = await agent.list_counterparties(type_filter=type)
        return {"counterparties": counterparties, "count": len(counterparties)}
    except Exception as e:
        logger.error(f"Error listing counterparties: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/counterparties")
async def create_counterparty(request: CounterpartyCreateRequest):
    """
    Create a new counterparty or return existing if a fuzzy match is found.
    """
    try:
        agent = _get_counterparty_agent()
        cp = await agent.create_or_get(
            name=request.name,
            city=request.city,
            state=request.state,
            type=request.type,
        )

        # If extra fields were provided and this is a new record, update them
        if request.gstin or request.pan or request.contact_name or request.contact_phone or request.credit_limit:
            update_data = {}
            if request.gstin:
                update_data["gstin"] = request.gstin
            if request.pan:
                update_data["pan"] = request.pan
            if request.contact_name:
                update_data["contact_name"] = request.contact_name
            if request.contact_phone:
                update_data["contact_phone"] = request.contact_phone
            if request.credit_limit > 0:
                update_data["credit_limit"] = request.credit_limit

            if update_data and cp.get("id"):
                try:
                    upd_res = (
                        get_client()
                        .table("counterparties")
                        .update(update_data)
                        .eq("id", cp["id"])
                        .execute()
                    )
                    if upd_res.data:
                        cp = upd_res.data[0]
                except Exception:
                    pass  # Non-critical: base record already created

        return {"counterparty": cp}
    except Exception as e:
        logger.error(f"Error creating counterparty: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/counterparties/{counterparty_id}/risk")
async def get_counterparty_risk(counterparty_id: str):
    """Get structured risk assessment for a counterparty."""
    try:
        agent = _get_counterparty_agent()
        assessment = await agent.get_risk_assessment(counterparty_id)
        return assessment
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting counterparty risk: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
