"""
TradeNexus API — Opportunity Router.

Endpoints for posting, listing, and matching trade opportunities and return loads.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from datetime import date

from core.database import get_client
from core.llm_provider import get_llm_provider
from core.embedding_service import get_embedding_service
from agents.commodity_agent import CommodityAgent

router = APIRouter()

# --- Schemas ---

class OpportunityCreate(BaseModel):
    commodity: str = Field(..., description="Commodity name or alias")
    origin: str = Field(..., description="Origin location (city/mandi)")
    destination: str = Field(..., description="Destination location (city/mandi)")
    quantity: float = Field(..., description="Quantity of cargo")
    unit: str = Field("tonnes", description="Unit of measurement (e.g. tonnes, quintals)")
    is_return_load: bool = Field(False, description="Whether this is a return load opportunity")
    contact_info: str = Field(..., description="Contact details")


class OpportunityResponse(BaseModel):
    id: str
    commodity_name: Optional[str] = None
    origin: str
    destination: str
    quantity: float
    unit: str
    is_return_load: bool
    contact_info: str
    status: str
    created_at: str


# --- Helper Singleton ---
_commodity_agent: Optional[CommodityAgent] = None

def get_commodity_agent() -> CommodityAgent:
    global _commodity_agent
    if _commodity_agent is None:
        _commodity_agent = CommodityAgent(
            embedding_service=get_embedding_service(),
            llm_provider=get_llm_provider(),
            supabase_client=get_client()
        )
    return _commodity_agent


@router.get("/", response_model=List[dict], summary="List Active Trade Opportunities")
async def list_opportunities():
    """
    Fetch all active open opportunities from the database.
    """
    supabase = get_client()
    try:
        res = supabase.table("trade_opportunities") \
            .select("*, commodities(canonical_name)") \
            .eq("status", "open") \
            .order("created_at", desc=True) \
            .execute()
        
        # Format the output so it includes the resolved commodity name cleanly
        formatted = []
        for r in (res.data or []):
            commodity_name = "Unknown"
            if r.get("commodities") and isinstance(r["commodities"], dict):
                commodity_name = r["commodities"].get("canonical_name", "Unknown")
            
            formatted.append({
                "id": r["id"],
                "commodity_name": commodity_name,
                "origin": r["origin"],
                "destination": r["destination"],
                "quantity": float(r["quantity"] or 0),
                "unit": r["unit"] or "tonnes",
                "is_return_load": bool(r["is_return_load"]),
                "contact_info": r["contact_info"],
                "status": r["status"] or "open",
                "created_at": r["created_at"]
            })
        return formatted
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to query opportunities: {str(e)}"
        )


@router.post("/", response_model=dict, status_code=201, summary="Post a Trade Opportunity")
async def create_opportunity(
    payload: OpportunityCreate,
    commodity_agent: CommodityAgent = Depends(get_commodity_agent)
):
    """
    Create a new trade or return load opportunity in the database.
    Resolves the provided commodity name to its UUID.
    """
    supabase = get_client()
    
    # Try resolving commodity text to commodity_id
    commodity_id = None
    try:
        res_result = await commodity_agent.resolve(payload.commodity)
        if res_result.tier != "unknown":
            commodity_id = res_result.commodity_id
    except Exception:
        pass

    # Fallback: if not resolved, look up first commodity in database or keep it null
    if not commodity_id:
        try:
            comm_list = supabase.table("commodities").select("id").limit(1).execute()
            if comm_list.data:
                commodity_id = comm_list.data[0]["id"]
        except Exception:
            pass

    row = {
        "commodity_id": commodity_id,
        "origin": payload.origin.strip(),
        "destination": payload.destination.strip(),
        "quantity": payload.quantity,
        "unit": payload.unit.strip(),
        "is_return_load": payload.is_return_load,
        "contact_info": payload.contact_info.strip(),
        "status": "open",
        "available_from": date.today().isoformat()
    }

    try:
        insert_res = supabase.table("trade_opportunities").insert(row).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to write opportunity to database.")
        
        record = insert_res.data[0]
        return {
            "status": "success",
            "message": "Opportunity posted successfully",
            "opportunity_id": record["id"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to post opportunity: {str(e)}"
        )
