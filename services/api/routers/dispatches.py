"""
TradeNexus API — Dispatches Router.

REST endpoints for dispatch management: create, update status,
and list with filters. Handles side effects on contract status,
counterparty reliability, and corridor scoring.
"""

import json
import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core.database import get_client
from agents.counterparty_agent import CounterpartyAgent

logger = logging.getLogger("dispatches_router")
logger.setLevel(logging.INFO)

router = APIRouter()


# --- Request Models ---


class DispatchCreateRequest(BaseModel):
    contract_id: str = Field(..., description="Contract UUID to link this dispatch to")
    dispatched_quantity: float = Field(..., gt=0)
    dispatch_date: str = Field(..., description="Date in YYYY-MM-DD format")
    vehicle_number: Optional[str] = None
    driver_contact: Optional[str] = None
    origin: str = Field(..., description="Origin location")
    destination: str = Field(..., description="Destination location")
    corridor_id: Optional[str] = None
    estimated_arrival: Optional[str] = None


class DispatchStatusUpdateRequest(BaseModel):
    status: str = Field(
        ..., description="New status: in_transit, delivered, delayed, cancelled"
    )
    delay_hours: Optional[float] = None
    delay_reason: Optional[str] = None


# --- Singleton Cache ---

_counterparty_agent: Optional[CounterpartyAgent] = None


def _get_counterparty_agent() -> CounterpartyAgent:
    global _counterparty_agent
    if _counterparty_agent is None:
        _counterparty_agent = CounterpartyAgent(supabase_client=get_client())
    return _counterparty_agent


# --- Endpoints ---


@router.post("/dispatches")
async def create_dispatch(request: DispatchCreateRequest):
    """
    Create a dispatch linked to a contract.
    Auto-generates dispatch number and sets contract to 'in_transit'.
    """
    try:
        sb = get_client()

        # 1. Validate contract exists
        contract_res = (
            sb.table("contracts")
            .select("id, status, counterparty_id, contract_number")
            .eq("id", request.contract_id)
            .limit(1)
            .execute()
        )
        if not contract_res.data:
            raise ValueError(f"Contract {request.contract_id} not found.")

        contract = contract_res.data[0]

        # 2. Generate dispatch number via DB function
        num_res = sb.rpc("generate_dispatch_number", {}).execute()
        dispatch_number = (
            num_res.data
            if isinstance(num_res.data, str)
            else f"TND-{date.today().year}-0001"
        )

        # 3. Insert dispatch
        row = {
            "dispatch_number": dispatch_number,
            "contract_id": request.contract_id,
            "dispatched_quantity": request.dispatched_quantity,
            "dispatch_date": request.dispatch_date,
            "vehicle_number": request.vehicle_number,
            "driver_contact": request.driver_contact,
            "origin": request.origin,
            "destination": request.destination,
            "corridor_id": request.corridor_id,
            "estimated_arrival": request.estimated_arrival,
            "status": "scheduled",
        }

        ins_res = sb.table("dispatches").insert(row).execute()
        dispatch = ins_res.data[0] if ins_res.data else row

        # 4. Set contract status to 'in_transit' if currently 'confirmed'
        if contract["status"] == "confirmed":
            sb.table("contracts").update({"status": "in_transit"}).eq(
                "id", request.contract_id
            ).execute()

        # 5. Log activity
        _log_activity(
            sb,
            action_type="dispatch_created",
            summary=(
                f"Dispatch {dispatch_number} created for contract "
                f"{contract.get('contract_number', request.contract_id)}: "
                f"{request.dispatched_quantity} units {request.origin} → {request.destination}"
            ),
            detail={"dispatch_id": dispatch.get("id"), "contract_id": request.contract_id},
            contracts_affected=1,
        )

        return {"dispatch": dispatch}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating dispatch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/dispatches/{dispatch_id}/status")
async def update_dispatch_status(
    dispatch_id: str, request: DispatchStatusUpdateRequest
):
    """
    Update dispatch status with side effects:
    - delivered → update counterparty reliability, set contract delivered
    - delayed → degrade corridor reliability
    """
    try:
        sb = get_client()

        # Fetch dispatch
        disp_res = (
            sb.table("dispatches")
            .select("*")
            .eq("id", dispatch_id)
            .limit(1)
            .execute()
        )
        if not disp_res.data:
            raise ValueError(f"Dispatch {dispatch_id} not found.")

        dispatch = disp_res.data[0]

        # Build update
        update_data = {"status": request.status}
        if request.delay_hours is not None:
            update_data["delay_hours"] = request.delay_hours
        if request.delay_reason:
            update_data["delay_reason"] = request.delay_reason

        # --- Side effects ---

        if request.status == "delivered":
            # Set actual arrival
            update_data["actual_arrival"] = date.today().isoformat()

            # Get contract to find counterparty
            contract_id = dispatch.get("contract_id")
            if contract_id:
                c_res = (
                    sb.table("contracts")
                    .select("counterparty_id, contract_number")
                    .eq("id", contract_id)
                    .limit(1)
                    .execute()
                )

                if c_res.data:
                    counterparty_id = c_res.data[0].get("counterparty_id")

                    # Determine if on-time: no delay_hours or delay_hours == 0
                    was_on_time = (
                        dispatch.get("delay_hours") is None
                        or float(dispatch.get("delay_hours", 0)) == 0
                    ) and (
                        request.delay_hours is None
                        or request.delay_hours == 0
                    )

                    # Update counterparty reliability
                    if counterparty_id:
                        try:
                            agent = _get_counterparty_agent()
                            await agent.update_reliability(
                                counterparty_id, was_on_time
                            )
                        except Exception as rel_err:
                            logger.warning(
                                f"Reliability update failed: {rel_err}"
                            )

                    # Set contract status to 'delivered'
                    # Check if ALL dispatches for this contract are delivered
                    all_disp_res = (
                        sb.table("dispatches")
                        .select("id, status")
                        .eq("contract_id", contract_id)
                        .execute()
                    )
                    all_delivered = all(
                        d.get("status") == "delivered"
                        or d.get("id") == dispatch_id  # this one is being delivered now
                        for d in (all_disp_res.data or [])
                    )
                    if all_delivered:
                        sb.table("contracts").update(
                            {"status": "delivered"}
                        ).eq("id", contract_id).execute()

        elif request.status == "delayed":
            # Degrade corridor reliability
            corridor_id = dispatch.get("corridor_id")
            if corridor_id:
                try:
                    corr_res = (
                        sb.table("trade_corridors")
                        .select("id, reliability_score")
                        .eq("id", corridor_id)
                        .limit(1)
                        .execute()
                    )
                    if corr_res.data:
                        current_score = float(
                            corr_res.data[0].get("reliability_score", 0.7)
                        )
                        new_score = max(0.0, round(current_score - 0.05, 4))
                        sb.table("trade_corridors").update(
                            {"reliability_score": new_score}
                        ).eq("id", corridor_id).execute()
                except Exception as corr_err:
                    logger.warning(f"Corridor score update failed: {corr_err}")

        # Apply update
        upd_res = (
            sb.table("dispatches")
            .update(update_data)
            .eq("id", dispatch_id)
            .execute()
        )
        updated = upd_res.data[0] if upd_res.data else {**dispatch, **update_data}

        # Log activity
        _log_activity(
            sb,
            action_type="dispatch_status_update",
            summary=(
                f"Dispatch {dispatch.get('dispatch_number', dispatch_id)}: "
                f"{dispatch.get('status')} → {request.status}"
            ),
            detail={
                "dispatch_id": dispatch_id,
                "from": dispatch.get("status"),
                "to": request.status,
                "delay_hours": request.delay_hours,
            },
            contracts_affected=1,
        )

        return {"dispatch": updated}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating dispatch status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dispatches")
async def list_dispatches(
    status: Optional[str] = Query(None),
    contract_id: Optional[str] = Query(None),
):
    """List dispatches with contract and corridor info."""
    try:
        sb = get_client()

        query = sb.table("dispatches").select(
            "*, contracts(contract_number, type, status), "
            "trade_corridors(origin_region, destination_region, reliability_score)"
        )

        if status:
            query = query.eq("status", status)
        if contract_id:
            query = query.eq("contract_id", contract_id)

        query = query.order("created_at", desc=True)
        res = query.execute()

        dispatches = []
        for row in res.data or []:
            enriched = {**row}
            contract = row.get("contracts")
            enriched["contract_number"] = (
                contract.get("contract_number") if contract else None
            )
            enriched["contract_type"] = (
                contract.get("type") if contract else None
            )
            enriched["contract_status"] = (
                contract.get("status") if contract else None
            )

            corridor = row.get("trade_corridors")
            enriched["corridor_origin"] = (
                corridor.get("origin_region") if corridor else None
            )
            enriched["corridor_destination"] = (
                corridor.get("destination_region") if corridor else None
            )
            enriched["corridor_reliability"] = (
                corridor.get("reliability_score") if corridor else None
            )

            # Clean nested join objects
            enriched.pop("contracts", None)
            enriched.pop("trade_corridors", None)
            dispatches.append(enriched)

        return {"dispatches": dispatches, "count": len(dispatches)}

    except Exception as e:
        logger.error(f"Error listing dispatches: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Helpers ---


def _log_activity(
    sb,
    action_type: str,
    summary: str,
    detail: dict = None,
    contracts_affected: int = 0,
) -> None:
    """Insert an entry into agent_activity_log (fire-and-forget)."""
    try:
        sb.table("agent_activity_log").insert(
            {
                "agent_name": "Dispatch Manager",
                "action_type": action_type,
                "summary": summary,
                "detail": json.dumps(detail) if detail else None,
                "contracts_affected": contracts_affected,
            }
        ).execute()
    except Exception as exc:
        logger.warning("Activity log insert failed: %s", exc)
