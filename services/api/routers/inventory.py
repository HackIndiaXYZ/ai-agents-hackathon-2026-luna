"""
TradeNexus API — Inventory Router.

REST endpoints for user commodity stock levels.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.database import get_client
from core.embedding_service import get_embedding_service
from core.llm_provider import get_llm_provider
from agents.commodity_agent import CommodityAgent
from agents.inventory_agent import InventoryAgent

logger = logging.getLogger("inventory_router")
router = APIRouter()

_inventory_agent: Optional[InventoryAgent] = None


def _get_inventory_agent() -> InventoryAgent:
    global _inventory_agent
    if _inventory_agent is None:
        sb = get_client()
        commodity_agent = CommodityAgent(
            embedding_service=get_embedding_service(),
            llm_provider=get_llm_provider(),
            supabase_client=sb,
        )
        _inventory_agent = InventoryAgent(
            commodity_agent=commodity_agent,
            supabase_client=sb,
        )
    return _inventory_agent


class InventoryUpdateRequest(BaseModel):
    commodity: str = Field(..., description="Commodity name (canonical or regional alias)")
    quantity: float = Field(..., gt=0)
    operation: str = Field("add", description="add | subtract | set")
    unit: str = Field("quintal")
    notes: Optional[str] = None


@router.get("/inventory")
async def get_inventory():
    """Return all user inventory items with canonical commodity names."""
    try:
        agent = _get_inventory_agent()
        items = await agent.get_inventory()
        summary = await agent.get_inventory_summary()
        return {"inventory": items, "summary": summary, "count": len(items)}
    except Exception as e:
        logger.error("Error fetching inventory: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory")
async def update_inventory(request: InventoryUpdateRequest):
    """Add, subtract, or set inventory quantity for a commodity."""
    op = request.operation.lower().strip()
    if op not in ("add", "subtract", "set"):
        raise HTTPException(status_code=400, detail="operation must be add, subtract, or set")

    try:
        agent = _get_inventory_agent()
        result = await agent.update_inventory(
            commodity_input=request.commodity,
            quantity=request.quantity,
            operation=op,
            unit=request.unit,
        )
        if result.get("status") in ("error", "shortfall"):
            raise HTTPException(status_code=422, detail=result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating inventory: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
