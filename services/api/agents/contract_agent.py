"""
TradeNexus — Contract Agent.

Core CTRM agent responsible for contract lifecycle management:
create, update status, query, detail, and natural-language parsing.
"""

import json
import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from core.llm_provider import LLMProvider, get_llm_provider

logger = logging.getLogger("contract_agent")
logger.setLevel(logging.INFO)


# Valid status transitions
_TRANSITIONS: Dict[str, List[str]] = {
    "draft": ["confirmed", "cancelled"],
    "confirmed": ["in_transit", "cancelled"],
    "in_transit": ["delivered", "cancelled"],
    "delivered": ["settled", "cancelled"],
    "settled": [],
    "cancelled": [],
}


class ContractAgent:
    """Agent responsible for contract lifecycle within the CTRM layer."""

    def __init__(self, supabase_client, commodity_agent):
        self.sb = supabase_client
        self.commodity_agent = commodity_agent
        self.llm: LLMProvider = get_llm_provider()

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    async def create_contract(self, data: dict) -> dict:
        """
        Create a new contract after validating commodity, generating a
        contract number, and logging the activity.
        """
        # 1. Resolve commodity
        commodity_input = data.get("commodity") or data.get("commodity_id", "")
        resolution = await self.commodity_agent.resolve(str(commodity_input))
        commodity_id = resolution.commodity_id
        commodity_name = resolution.canonical_name or commodity_input

        if not commodity_id:
            raise ValueError(
                f"Could not resolve commodity '{commodity_input}' to a known commodity."
            )

        # 2. Generate contract number via DB function
        num_res = self.sb.rpc("generate_contract_number", {}).execute()
        contract_number = (
            num_res.data if isinstance(num_res.data, str) else f"TN-{date.today().year}-0001"
        )

        # 3. Build row
        quantity = float(data.get("quantity", 0))
        price_per_unit = data.get("price_per_unit")
        price_type = data.get("price_type", "fixed")
        contract_value = None

        if price_type == "fixed" and price_per_unit is not None:
            price_per_unit = float(price_per_unit)
            contract_value = round(quantity * price_per_unit, 2)
        elif price_type == "formula":
            price_per_unit = None  # calculated at settlement

        row = {
            "contract_number": contract_number,
            "type": data.get("type", "buy"),
            "commodity_id": commodity_id,
            "counterparty_id": data.get("counterparty_id"),
            "quantity": quantity,
            "unit": data.get("unit", "quintal"),
            "price_per_unit": price_per_unit,
            "price_type": price_type,
            "formula_basis": data.get("formula_basis") if price_type == "formula" else None,
            "formula_premium_pct": float(data.get("formula_premium_pct", 0)),
            "contract_date": data.get("contract_date", date.today().isoformat()),
            "delivery_date": data.get("delivery_date"),
            "delivery_location": data.get("delivery_location"),
            "status": "draft",
            "payment_terms": data.get("payment_terms"),
            "notes": data.get("notes"),
        }

        res = self.sb.table("contracts").insert(row).execute()
        contract = res.data[0] if res.data else row

        # 4. Resolve counterparty name for logging
        counterparty_name = "Unknown"
        if data.get("counterparty_id"):
            cp_res = (
                self.sb.table("counterparties")
                .select("name")
                .eq("id", data["counterparty_id"])
                .limit(1)
                .execute()
            )
            if cp_res.data:
                counterparty_name = cp_res.data[0]["name"]

        # 5. Log activity
        self._log_activity(
            action_type="contract_created",
            summary=(
                f"Contract {contract_number} created: {row['type']} "
                f"{quantity} {row['unit']} {commodity_name} "
                f"with {counterparty_name}"
            ),
            detail={"contract_id": contract.get("id"), "contract_value": contract_value},
            contracts_affected=1,
        )

        # 6. Return enriched record
        contract["commodity_name"] = commodity_name
        contract["counterparty_name"] = counterparty_name
        contract["contract_value"] = contract_value
        return contract

    # ------------------------------------------------------------------
    # Update Status
    # ------------------------------------------------------------------

    async def update_status(
        self, contract_id: str, new_status: str, notes: str = None
    ) -> dict:
        """
        Transition contract status with strict validation.
        Supports querying by UUID or contract_number.
        """
        # Fetch current contract
        is_uuid = False
        try:
            from uuid import UUID
            UUID(contract_id)
            is_uuid = True
        except ValueError:
            is_uuid = False

        query = self.sb.table("contracts").select("*")
        if is_uuid:
            query = query.eq("id", contract_id)
        else:
            query = query.eq("contract_number", contract_id)

        res = query.limit(1).execute()
        if not res.data:
            raise ValueError(f"Contract {contract_id} not found.")

        contract = res.data[0]
        real_contract_id = contract["id"]
        current_status = contract["status"]

        # Validate transition
        if new_status == "cancelled":
            pass  # always allowed
        elif new_status not in _TRANSITIONS.get(current_status, []):
            raise ValueError(
                f"Invalid transition: '{current_status}' → '{new_status}'. "
                f"Allowed: {_TRANSITIONS.get(current_status, [])}"
            )

        # Special check: confirmed → in_transit requires at least one dispatch
        if current_status == "confirmed" and new_status == "in_transit":
            disp_res = (
                self.sb.table("dispatches")
                .select("id", count="exact")
                .eq("contract_id", real_contract_id)
                .execute()
            )
            dispatch_count = disp_res.count if disp_res.count is not None else 0
            if dispatch_count == 0:
                raise ValueError(
                    "Cannot move to 'in_transit': no dispatches exist for this contract. "
                    "Create a dispatch first."
                )

        # Update
        update_data: Dict[str, Any] = {"status": new_status}
        if notes:
            update_data["notes"] = notes

        upd_res = (
            self.sb.table("contracts")
            .update(update_data)
            .eq("id", real_contract_id)
            .execute()
        )
        updated = upd_res.data[0] if upd_res.data else {**contract, **update_data}

        # Log
        self._log_activity(
            action_type="status_transition",
            summary=(
                f"Contract {contract.get('contract_number', contract_id)}: "
                f"{current_status} → {new_status}"
            ),
            detail={
                "contract_id": real_contract_id,
                "from": current_status,
                "to": new_status,
                "notes": notes,
            },
            contracts_affected=1,
        )

        return updated

    # ------------------------------------------------------------------
    # List Contracts
    # ------------------------------------------------------------------

    async def get_contracts(self, filters: dict = None) -> List[dict]:
        """
        Retrieve contracts with joined commodity & counterparty names
        and the latest P&L snapshot. Supports filtering by name or ID.
        """
        filters = filters or {}

        query = self.sb.table("contracts").select(
            "*, commodities(canonical_name), counterparties(name)"
        )

        if filters.get("status"):
            query = query.eq("status", filters["status"])

        # Resolve commodity if it's a name instead of UUID
        commodity_val = filters.get("commodity_id") or filters.get("commodity")
        if commodity_val:
            is_uuid = False
            try:
                from uuid import UUID
                UUID(commodity_val)
                is_uuid = True
            except ValueError:
                is_uuid = False

            if not is_uuid:
                try:
                    res_commodity = await self.commodity_agent.resolve(str(commodity_val))
                    if res_commodity and res_commodity.commodity_id:
                        commodity_val = res_commodity.commodity_id
                    else:
                        commodity_val = None
                except Exception as e:
                    logger.warning(f"Failed to resolve commodity name {commodity_val}: {e}")
                    commodity_val = None

            if commodity_val:
                query = query.eq("commodity_id", commodity_val)

        # Resolve counterparty if it's a name instead of UUID
        counterparty_val = filters.get("counterparty_id") or filters.get("counterparty")
        if counterparty_val:
            is_uuid = False
            try:
                from uuid import UUID
                UUID(counterparty_val)
                is_uuid = True
            except ValueError:
                is_uuid = False

            if not is_uuid:
                try:
                    cp_res = (
                        self.sb.table("counterparties")
                        .select("id")
                        .ilike("name", f"%{counterparty_val}%")
                        .limit(1)
                        .execute()
                    )
                    if cp_res.data:
                        counterparty_val = cp_res.data[0]["id"]
                    else:
                        counterparty_val = None
                except Exception as e:
                    logger.warning(f"Failed to resolve counterparty name {counterparty_val}: {e}")
                    counterparty_val = None

            if counterparty_val:
                query = query.eq("counterparty_id", counterparty_val)

        if filters.get("date_from"):
            query = query.gte("contract_date", filters["date_from"])
        if filters.get("date_to"):
            query = query.lte("contract_date", filters["date_to"])
        if filters.get("type"):
            query = query.eq("type", filters["type"])

        query = query.order("created_at", desc=True)
        res = query.execute()

        contracts = []
        for row in res.data or []:
            enriched = {**row}
            comm = row.get("commodities")
            enriched["commodity_name"] = comm.get("canonical_name") if comm else None
            cp = row.get("counterparties")
            enriched["counterparty_name"] = cp.get("name") if cp else None

            # Latest P&L snapshot
            pnl_res = (
                self.sb.table("pnl_snapshots")
                .select("unrealized_pnl, pnl_pct, market_price, snapshot_date")
                .eq("contract_id", row["id"])
                .order("snapshot_date", desc=True)
                .limit(1)
                .execute()
            )
            enriched["latest_pnl"] = pnl_res.data[0] if pnl_res.data else None

            # Remove nested join objects
            enriched.pop("commodities", None)
            enriched.pop("counterparties", None)
            contracts.append(enriched)

        return contracts

    # ------------------------------------------------------------------
    # Contract Detail
    # ------------------------------------------------------------------

    async def get_contract_detail(self, contract_id: str) -> dict:
        """
        Full contract detail with dispatches, quality lots, P&L history,
        and compliance status. Supports querying by UUID or contract_number.
        """
        # Core contract
        is_uuid = False
        try:
            from uuid import UUID
            UUID(contract_id)
            is_uuid = True
        except ValueError:
            is_uuid = False

        query = self.sb.table("contracts").select("*, commodities(canonical_name, category), counterparties(*)")
        if is_uuid:
            query = query.eq("id", contract_id)
        else:
            query = query.eq("contract_number", contract_id)

        res = query.limit(1).execute()
        if not res.data:
            raise ValueError(f"Contract {contract_id} not found.")

        contract = res.data[0]
        real_contract_id = contract["id"]

        # Dispatches
        disp_res = (
            self.sb.table("dispatches")
            .select("*")
            .eq("contract_id", real_contract_id)
            .order("dispatch_date", desc=True)
            .execute()
        )

        # Quality lots
        lots_res = (
            self.sb.table("quality_lots")
            .select("*")
            .eq("contract_id", real_contract_id)
            .order("created_at", desc=True)
            .execute()
        )

        # P&L history (last 7 snapshots)
        pnl_res = (
            self.sb.table("pnl_snapshots")
            .select("*")
            .eq("contract_id", real_contract_id)
            .order("snapshot_date", desc=True)
            .limit(7)
            .execute()
        )

        # Compliance status derivation
        dispatched_qty = sum(
            float(d.get("dispatched_quantity", 0)) for d in (disp_res.data or [])
        )
        contract_qty = float(contract.get("quantity", 0))
        compliance = {
            "quantity_fulfilled": dispatched_qty >= contract_qty,
            "dispatched_quantity": dispatched_qty,
            "contract_quantity": contract_qty,
            "fulfillment_pct": round(
                (dispatched_qty / contract_qty * 100) if contract_qty > 0 else 0, 1
            ),
        }

        return {
            "contract": contract,
            "dispatches": disp_res.data or [],
            "quality_lots": lots_res.data or [],
            "pnl_history": pnl_res.data or [],
            "compliance": compliance,
        }

    # ------------------------------------------------------------------
    # Parse from Natural Language
    # ------------------------------------------------------------------

    async def parse_from_text(self, raw_text: str) -> dict:
        """
        Use LLM to extract contract fields from natural language.
        Returns extracted fields as a dict (not saved yet).
        Guarantees schema compliance and type safety across both Mock and Production.
        """
        system_prompt = (
            "You are a contract parser for an Indian agricultural commodity trading platform.\n"
            "Extract contract details from the user's text. Return ONLY valid JSON with these fields:\n"
            "{\n"
            '  "type": "buy" or "sell",\n'
            '  "commodity": string (commodity name),\n'
            '  "quantity": float,\n'
            '  "unit": string (default "quintal"),\n'
            '  "price": float or null,\n'
            '  "counterparty": string or null,\n'
            '  "delivery_date": string (YYYY-MM-DD) or null,\n'
            '  "delivery_location": string or null,\n'
            '  "payment_terms": string or null\n'
            "}\n"
            "If a field is unclear, return null for it."
        )

        raw = await self.llm.complete(
            system_prompt=system_prompt,
            user_prompt=raw_text,
            expect_json=True,
            max_tokens=400,
        )

        parsed = _safe_json(raw)
        
        # Build normalized schema response to guarantee exact identical fields & types across environments
        normalized = {
            "type": None,
            "commodity": None,
            "quantity": None,
            "unit": "quintal",
            "price": None,
            "counterparty": None,
            "delivery_date": None,
            "delivery_location": None,
            "payment_terms": None,
            "raw_text": raw_text,
        }

        if parsed and isinstance(parsed, dict):
            # 1. Type
            ctype = parsed.get("type")
            if ctype:
                ctype_str = str(ctype).strip().lower()
                if "sell" in ctype_str or "sale" in ctype_str:
                    normalized["type"] = "sell"
                elif "buy" in ctype_str or "purchase" in ctype_str:
                    normalized["type"] = "buy"
            
            # 2. Commodity
            comm = parsed.get("commodity")
            if comm:
                normalized["commodity"] = str(comm).strip().title()
            
            # 3. Quantity
            qty = parsed.get("quantity")
            if qty is not None:
                try:
                    normalized["quantity"] = float(qty)
                except (ValueError, TypeError):
                    pass
            
            # 4. Unit
            unit = parsed.get("unit")
            if unit:
                normalized["unit"] = str(unit).strip().lower()
            
            # 5. Price
            price = parsed.get("price")
            if price is not None:
                try:
                    normalized["price"] = float(price)
                except (ValueError, TypeError):
                    pass
            
            # 6. Counterparty
            cp = parsed.get("counterparty")
            if cp:
                normalized["counterparty"] = str(cp).strip().title()
            
            # 7. Delivery Date
            dd = parsed.get("delivery_date")
            if dd:
                normalized["delivery_date"] = str(dd).strip()
            
            # 8. Delivery Location
            loc = parsed.get("delivery_location")
            if loc:
                normalized["delivery_location"] = str(loc).strip()
            
            # 9. Payment Terms
            pt = parsed.get("payment_terms")
            if pt:
                normalized["payment_terms"] = str(pt).strip()
        else:
            normalized["parse_error"] = "Could not extract structured data from the text."

        return normalized

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _log_activity(
        self,
        action_type: str,
        summary: str,
        detail: dict = None,
        contracts_affected: int = 0,
        duration_ms: int = None,
    ) -> None:
        """Insert an entry into agent_activity_log (fire-and-forget)."""
        try:
            self.sb.table("agent_activity_log").insert(
                {
                    "agent_name": "Contract Agent",
                    "action_type": action_type,
                    "summary": summary,
                    "detail": json.dumps(detail) if detail else None,
                    "contracts_affected": contracts_affected,
                    "duration_ms": duration_ms,
                }
            ).execute()
        except Exception as exc:
            logger.warning("Activity log insert failed: %s", exc)


def _safe_json(text: str) -> Optional[dict]:
    """Parse JSON from LLM response, handling markdown fences."""
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        for part in parts:
            stripped = part.strip()
            if stripped.startswith("json"):
                stripped = stripped[4:].strip()
            if stripped.startswith("{"):
                clean = stripped
                break
    try:
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return None
