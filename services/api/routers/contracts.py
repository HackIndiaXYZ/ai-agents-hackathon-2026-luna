"""
TradeNexus API — Contracts Router.

Provides REST endpoints for contract lifecycle management:
list, create, detail, status transitions, and NL parsing.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core.database import get_client
from core.embedding_service import get_embedding_service
from core.llm_provider import get_llm_provider
from agents.commodity_agent import CommodityAgent
from agents.contract_agent import ContractAgent
from agents.counterparty_agent import CounterpartyAgent

logger = logging.getLogger("contracts_router")
logger.setLevel(logging.INFO)

router = APIRouter()


# --- Request / Response Models ---


class ContractCreateRequest(BaseModel):
    type: str = Field(..., description="Contract type: 'buy' or 'sell'")
    commodity: str = Field(..., description="Commodity name, alias, or ID")
    counterparty_id: Optional[str] = None
    quantity: float = Field(..., gt=0, description="Quantity in specified unit")
    unit: str = Field("quintal", description="Unit of measurement, defaults to quintal")
    price_per_unit: Optional[float] = Field(None, description="Price per unit (required if price_type is fixed)")
    price_type: str = Field("fixed", description="Pricing mechanism: 'fixed' or 'formula'")
    formula_basis: Optional[str] = Field(None, description="Formula basis: 'mandi_modal' or 'spot'")
    formula_premium_pct: float = Field(0, description="Formula premium percentage")
    contract_date: Optional[str] = Field(None, description="Contract date in YYYY-MM-DD format")
    delivery_date: Optional[str] = Field(None, description="Delivery date in YYYY-MM-DD format")
    delivery_location: Optional[str] = Field(None, description="Delivery location")
    payment_terms: Optional[str] = Field(None, description="Payment terms details")
    notes: Optional[str] = Field(None, description="Optional contract notes")

    model_config = {
        "json_schema_extra": {
            "example": {
                "type": "buy",
                "commodity": "Cotton",
                "counterparty_id": "d3b07384-d113-49c5-a55b-4c2f1b8a5d3f",
                "quantity": 100.0,
                "unit": "quintal",
                "price_per_unit": 6500.0,
                "price_type": "fixed",
                "contract_date": "2026-06-02",
                "delivery_date": "2026-06-15",
                "delivery_location": "Yavatmal Mandi",
                "payment_terms": "Net 15",
                "notes": "Premium quality cotton"
            }
        }
    }


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status value: draft, confirmed, in_transit, delivered, settled, cancelled")
    notes: Optional[str] = Field(None, description="Optional transition notes")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "confirmed",
                "notes": "Contract signed by both parties."
            }
        }
    }


class ParseRequest(BaseModel):
    raw_text: str = Field(..., description="Natural language contract description")

    model_config = {
        "json_schema_extra": {
            "example": {
                "raw_text": "Ramesh se 40 quintal cotton liya, 6400 rupaye, delivery Friday"
            }
        }
    }


# --- Singleton Agent Cache ---


_contract_agent: Optional[ContractAgent] = None
_commodity_agent: Optional[CommodityAgent] = None


def _get_commodity_agent() -> CommodityAgent:
    global _commodity_agent
    if _commodity_agent is None:
        _commodity_agent = CommodityAgent(
            embedding_service=get_embedding_service(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client(),
        )
    return _commodity_agent


def _get_contract_agent() -> ContractAgent:
    global _contract_agent
    if _contract_agent is None:
        _contract_agent = ContractAgent(
            supabase_client=get_client(),
            commodity_agent=_get_commodity_agent(),
        )
    return _contract_agent


# --- Endpoints ---


@router.get("/contracts")
async def list_contracts(
    status: Optional[str] = Query(None),
    commodity: Optional[str] = Query(None),
    counterparty: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
):
    """List contracts with optional filters and MtM P&L per contract."""
    try:
        filters = {}
        if status:
            filters["status"] = status
        if commodity:
            filters["commodity_id"] = commodity
        if counterparty:
            filters["counterparty_id"] = counterparty
        if date_from:
            filters["date_from"] = date_from
        if date_to:
            filters["date_to"] = date_to
        if type:
            filters["type"] = type

        agent = _get_contract_agent()
        contracts = await agent.get_contracts(filters)
        return {"contracts": contracts, "count": len(contracts)}
    except Exception as e:
        logger.error(f"Error listing contracts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contracts")
async def create_contract(request: ContractCreateRequest):
    """Create a new contract."""
    try:
        agent = _get_contract_agent()
        contract = await agent.create_contract(request.model_dump())
        return {"contract": contract}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating contract: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contracts/{contract_id}")
async def get_contract_detail(contract_id: str):
    """Get full contract detail with dispatches, quality lots, and P&L history."""
    try:
        agent = _get_contract_agent()
        detail = await agent.get_contract_detail(contract_id)
        return detail
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting contract detail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/contracts/{contract_id}/status")
async def update_contract_status(contract_id: str, request: StatusUpdateRequest):
    """Update contract status with validated transitions."""
    try:
        agent = _get_contract_agent()
        updated = await agent.update_status(
            contract_id=contract_id,
            new_status=request.status,
            notes=request.notes,
        )
        return {"contract": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating contract status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contracts/parse")
async def parse_contract_text(request: ParseRequest):
    """
    Parse natural language into contract fields for preview.
    Returns extracted fields — not saved until user confirms.
    """
    try:
        agent = _get_contract_agent()
        parsed = await agent.parse_from_text(request.raw_text)
        return {"parsed": parsed, "saved": False}
    except Exception as e:
        logger.error(f"Error parsing contract text: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
