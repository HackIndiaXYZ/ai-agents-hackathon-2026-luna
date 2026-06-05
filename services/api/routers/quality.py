"""
TradeNexus API — Quality Lots Router.

Field inspection records with moisture-based price adjustments.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core.database import get_client

logger = logging.getLogger("quality_router")
router = APIRouter()

MOISTURE_THRESHOLDS = {
    "cotton": {"ideal": 8, "warn": 12, "reject": 18},
    "soybean": {"ideal": 10, "warn": 13, "reject": 17},
    "wheat": {"ideal": 10, "warn": 12, "reject": 16},
    "onion": {"ideal": 5, "warn": 8, "reject": 14},
    "pigeon pea": {"ideal": 9, "warn": 12, "reject": 16},
    "groundnut": {"ideal": 7, "warn": 10, "reject": 15},
    "mustard": {"ideal": 6, "warn": 9, "reject": 14},
    "chilli": {"ideal": 8, "warn": 11, "reject": 16},
}

GRADE_PENALTY = {"A": 0, "B": 3, "C": 7, "Mixed": 10}


def _compute_penalty_pct(commodity: str, moisture: float, grade: str) -> float:
    key = commodity.lower().strip()
    thresh = MOISTURE_THRESHOLDS.get(key, {"ideal": 10, "warn": 13, "reject": 17})
    penalty = GRADE_PENALTY.get(grade, 3)
    if moisture > thresh["reject"]:
        penalty += 12
    elif moisture > thresh["warn"]:
        penalty += 5
    elif moisture > thresh["ideal"]:
        penalty += 2
    return min(penalty, 25.0)


def _resolve_contract(sb, contract_ref: str) -> dict:
    """Resolve contract by UUID or contract_number."""
    res = (
        sb.table("contracts")
        .select("id, contract_number, commodity_id, quantity, price_per_unit, delivery_location, commodities(canonical_name)")
        .eq("id", contract_ref)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]
    res = (
        sb.table("contracts")
        .select("id, contract_number, commodity_id, quantity, price_per_unit, delivery_location, commodities(canonical_name)")
        .eq("contract_number", contract_ref)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=404, detail=f"Contract '{contract_ref}' not found")


class QualityLotCreateRequest(BaseModel):
    contract_id: str = Field(..., description="Contract UUID or contract_number")
    moisture_pct: float = Field(..., ge=0, le=100)
    broken_grains_pct: float = Field(0, ge=0, le=100)
    foreign_matter_pct: float = Field(0, ge=0, le=100)
    grade: str = Field("B", description="A | B | C | Mixed")
    quantity: Optional[float] = None
    origin_location: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    field_agent_note: Optional[str] = None
    agent_name: Optional[str] = None


@router.get("/quality-lots")
async def list_quality_lots(
    contract_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """List quality inspection lots, optionally filtered by contract."""
    try:
        sb = get_client()
        query = (
            sb.table("quality_lots")
            .select("*, contracts(contract_number, price_per_unit, commodities(canonical_name))")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if contract_id:
            contract = _resolve_contract(sb, contract_id)
            query = query.eq("contract_id", contract["id"])

        res = query.execute()
        lots = []
        for row in res.data or []:
            contract = row.get("contracts") or {}
            comm = contract.get("commodities") or {}
            base_price = float(contract.get("price_per_unit") or row.get("base_price") or 0)
            adj_pct = float(row.get("price_adjustment_pct") or 0)
            lots.append({
                "id": row["id"],
                "contract_id": contract.get("contract_number") or row.get("contract_id"),
                "commodity": comm.get("canonical_name", "Unknown"),
                "quantity": float(row.get("quantity") or 0),
                "moisture": float(row.get("moisture_pct") or 0),
                "broken_pct": float(row.get("broken_grains_pct") or 0),
                "foreign_matter": float(row.get("foreign_matter_pct") or 0),
                "grade": row.get("grade") or "B",
                "base_price": base_price,
                "adjusted_price": round(base_price * (1 - adj_pct / 100), 2) if base_price else 0,
                "penalty_pct": adj_pct,
                "gps_lat": str(row.get("origin_lat") or ""),
                "gps_lng": str(row.get("origin_lng") or ""),
                "location_name": row.get("origin_location") or "",
                "agent_name": row.get("agent_name") or "Field Agent",
                "agent_remarks": row.get("field_agent_note") or "",
                "inspected_at": row.get("created_at"),
                "status": "needs_review" if adj_pct > 15 else "approved",
            })
        return {"quality_lots": lots, "count": len(lots)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error listing quality lots: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quality-lots", status_code=201)
async def create_quality_lot(request: QualityLotCreateRequest):
    """Record a field quality inspection with automatic price adjustment."""
    try:
        sb = get_client()
        contract = _resolve_contract(sb, request.contract_id)
        comm = contract.get("commodities") or {}
        commodity_name = comm.get("canonical_name", "Cotton")
        base_price = float(contract.get("price_per_unit") or 0)
        qty = request.quantity or float(contract.get("quantity") or 0)
        penalty = _compute_penalty_pct(commodity_name, request.moisture_pct, request.grade)

        row = {
            "contract_id": contract["id"],
            "commodity_id": contract.get("commodity_id"),
            "quantity": qty,
            "unit": "quintal",
            "moisture_pct": request.moisture_pct,
            "grade": request.grade,
            "foreign_matter_pct": request.foreign_matter_pct,
            "broken_grains_pct": request.broken_grains_pct,
            "origin_location": request.origin_location or contract.get("delivery_location"),
            "price_adjustment_pct": penalty,
            "field_agent_note": request.field_agent_note,
        }
        if request.origin_lat is not None:
            row["origin_lat"] = request.origin_lat
        if request.origin_lng is not None:
            row["origin_lng"] = request.origin_lng

        res = sb.table("quality_lots").insert(row).execute()
        created = res.data[0] if res.data else row

        return {
            "status": "created",
            "quality_lot": {
                "id": created.get("id"),
                "contract_id": contract.get("contract_number"),
                "commodity": commodity_name,
                "quantity": qty,
                "moisture": request.moisture_pct,
                "broken_pct": request.broken_grains_pct,
                "foreign_matter": request.foreign_matter_pct,
                "grade": request.grade,
                "base_price": base_price,
                "adjusted_price": round(base_price * (1 - penalty / 100), 2),
                "penalty_pct": penalty,
                "location_name": row.get("origin_location"),
                "agent_remarks": request.field_agent_note,
                "status": "needs_review" if penalty > 15 else "approved",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating quality lot: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
