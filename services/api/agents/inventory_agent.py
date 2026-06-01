"""
TradeNexus — Inventory Agent.

Manages user-owned commodity stock, updates inventory, gets summaries,
and performs order/contract fulfillment checks.
"""

import logging
from typing import Optional, List, Dict, Any
from agents.commodity_agent import CommodityAgent

logger = logging.getLogger("inventory_agent")
logger.setLevel(logging.INFO)


class InventoryAgent:
    """Agent responsible for querying, updating, and checking fulfillment against user inventory."""

    def __init__(self, commodity_agent: CommodityAgent, supabase_client):
        self.commodity_agent = commodity_agent
        self.sb = supabase_client

    async def get_inventory(self) -> List[Dict[str, Any]]:
        """Fetch all user inventory items with their canonical commodity name."""
        try:
            res = self.sb.table("user_inventory").select("id, commodity_id, quantity, unit, notes, updated_at, commodities(canonical_name)").execute()
            if not res.data:
                return []

            inventory = []
            for row in res.data:
                comm = row.get("commodities")
                canonical_name = comm.get("canonical_name") if comm else "Unknown"
                inventory.append({
                    "id": row["id"],
                    "commodity_id": row["commodity_id"],
                    "canonical_name": canonical_name,
                    "quantity": float(row["quantity"]),
                    "unit": row.get("unit", "quintal"),
                    "notes": row.get("notes", ""),
                    "updated_at": row.get("updated_at")
                })
            # order by quantity DESC
            inventory.sort(key=lambda x: x["quantity"], reverse=True)
            return inventory
        except Exception as e:
            logger.error(f"Error in get_inventory: {e}")
            return []

    async def update_inventory(
        self,
        commodity_input: str,
        quantity: float,
        operation: str,  # "add" | "subtract" | "set"
        unit: str = "quintal"
    ) -> Dict[str, Any]:
        """Update inventory levels for a commodity after resolving its name."""
        try:
            # 1. Resolve commodity name
            res_resolve = await self.commodity_agent.resolve(commodity_input)
            if not res_resolve.canonical_name or not res_resolve.commodity_id:
                return {
                    "status": "error",
                    "message": f"Could not resolve commodity input '{commodity_input}' to a canonical commodity."
                }

            canonical_name = res_resolve.canonical_name
            commodity_id = res_resolve.commodity_id

            # 2. Check current inventory for this commodity
            check = self.sb.table("user_inventory").select("id, quantity, unit").eq("commodity_id", commodity_id).execute()

            current_qty = 0.0
            existing_id = None

            if check.data:
                existing_id = check.data[0]["id"]
                current_qty = float(check.data[0]["quantity"])
                unit = check.data[0].get("unit") or unit

            # 3. Apply operation
            operation = operation.lower()
            if operation == "add":
                new_qty = current_qty + quantity
            elif operation == "subtract":
                new_qty = current_qty - quantity
                if new_qty < 0:
                    return {
                        "status": "shortfall",
                        "message": f"Shortfall: Cannot subtract {quantity} {unit} from {current_qty} {unit} of {canonical_name}.",
                        "available": current_qty,
                        "shortfall": quantity - current_qty,
                        "canonical_name": canonical_name
                    }
            elif operation == "set":
                new_qty = quantity
            else:
                return {
                    "status": "error",
                    "message": f"Invalid operation '{operation}'. Use 'add', 'subtract', or 'set'."
                }

            # 4. Upsert
            row = {
                "commodity_id": commodity_id,
                "quantity": new_qty,
                "unit": unit
            }

            if existing_id:
                res_upd = self.sb.table("user_inventory").update(row).eq("id", existing_id).execute()
                data = res_upd.data[0] if res_upd.data else row
            else:
                res_ins = self.sb.table("user_inventory").insert(row).execute()
                data = res_ins.data[0] if res_ins.data else row

            return {
                "status": "success",
                "canonical_name": canonical_name,
                "operation": operation,
                "previous_quantity": current_qty,
                "new_quantity": new_qty,
                "unit": unit,
                "data": data
            }

        except Exception as e:
            logger.error(f"Error in update_inventory: {e}")
            return {
                "status": "error",
                "message": f"An error occurred while updating inventory: {str(e)}"
            }

    async def get_inventory_summary(self) -> str:
        """Get a concise natural language summary of current inventory."""
        inv = await self.get_inventory()
        if not inv:
            return "Your inventory is currently empty."

        parts = []
        for item in inv:
            parts.append(f"{item['canonical_name']}: {item['quantity']:.1f} {item['unit']}")
        return ", ".join(parts)

    async def check_fulfillment(self, requirements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Check if inventory can fulfill the specified requirements.
        Each requirement dict should look like: {"commodity": str, "quantity": float, "unit": Optional[str]}
        """
        try:
            # Get current flat inventory list
            inv = await self.get_inventory()
            inv_map = {item["canonical_name"].lower(): item for item in inv}

            can_fulfill = True
            shortfalls = []
            available_list = []

            for req in requirements:
                req_comm = req.get("commodity", "").strip()
                req_qty = float(req.get("quantity", 0))
                req_unit = req.get("unit", "quintal") or "quintal"

                # Resolve commodity name using commodity_agent
                res_resolve = await self.commodity_agent.resolve(req_comm)
                canonical_name = res_resolve.canonical_name or req_comm

                # Look up in our inventory map
                inv_item = inv_map.get(canonical_name.lower())
                available_qty = float(inv_item["quantity"]) if inv_item else 0.0
                item_unit = inv_item["unit"] if inv_item else req_unit

                available_list.append({
                    "commodity": canonical_name,
                    "quantity": available_qty,
                    "unit": item_unit
                })

                if available_qty < req_qty:
                    can_fulfill = False
                    shortfalls.append({
                        "commodity": canonical_name,
                        "required": req_qty,
                        "available": available_qty,
                        "shortfall": req_qty - available_qty,
                        "unit": item_unit
                    })

            return {
                "can_fulfill": can_fulfill,
                "shortfalls": shortfalls,
                "available": available_list
            }
        except Exception as e:
            logger.error(f"Error in check_fulfillment: {e}")
            return {
                "can_fulfill": False,
                "shortfalls": [],
                "available": [],
                "error": str(e)
            }
