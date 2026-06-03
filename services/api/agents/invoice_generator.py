"""
TradeNexus CTRM — Invoice Generator Agent.

Compiles contract, counterparty, and quality-lot data into a
GST-compliant invoice structure.  Handles:
  • Taxable value = quantity × price  (adjusted by quality-lot premium/discount)
  • Inter-state → IGST @ 18 %
  • Intra-state  → CGST @ 9 % + SGST @ 9 %
"""

import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger("invoice_generator")
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# HSN Code mapping — 20 major Indian agricultural commodities
# ---------------------------------------------------------------------------
HSN_MAP: Dict[str, str] = {
    "Cotton":       "5201",
    "Pigeon Pea":   "0713",
    "Chickpea":     "0713",
    "Soybean":      "1201",
    "Groundnut":    "1202",
    "Wheat":        "1001",
    "Rice":         "1006",
    "Maize":        "1005",
    "Sorghum":      "1007",
    "Pearl Millet": "1008",
    "Mustard":      "1207",
    "Sunflower":    "1206",
    "Onion":        "0703",
    "Tomato":       "0702",
    "Potato":       "0701",
    "Turmeric":     "0910",
    "Chilli":       "0904",
    "Cumin":        "0909",
    "Coriander":    "0909",
    "Sesame":       "1207",
}

# Default GST rate for agricultural commodities (%)
DEFAULT_GST_RATE = 5.0          # Most agri-commodities attract 5 % GST
IGST_RATE        = 5.0
CGST_RATE        = 2.5
SGST_RATE        = 2.5

# TradeNexus home state (for intra-/inter-state determination)
HOME_STATE = "Maharashtra"


class InvoiceGenerator:
    """Agent that produces structured invoice data for a given contract."""

    def __init__(self, supabase_client):
        self.sb = supabase_client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_invoice_data(self, contract_id: str) -> dict:
        """
        Build a complete invoice payload for *contract_id*.

        Returns a dict suitable for JSON serialisation containing:
        line items, quality adjustments, tax breakdowns, and totals.
        """
        # 1. Fetch the contract ------------------------------------------
        contract = await self._fetch_contract(contract_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found.")

        # 2. Resolve commodity canonical name & HSN -----------------------
        commodity_name, hsn_code = await self._resolve_commodity(
            contract.get("commodity_id")
        )

        # 3. Fetch counterparty for state determination -------------------
        counterparty = await self._fetch_counterparty(
            contract.get("counterparty_id")
        )
        cp_state = (counterparty or {}).get("state", HOME_STATE)

        # 4. Fetch quality lot adjustments (if any) -----------------------
        quality_lots = await self._fetch_quality_lots(contract_id)
        total_quality_adjustment_pct = self._aggregate_quality_adjustment(
            quality_lots
        )

        # 5. Compute financials -------------------------------------------
        quantity      = float(contract.get("quantity") or 0)
        price_per_unit = float(contract.get("price_per_unit") or 0)
        base_value    = round(quantity * price_per_unit, 2)

        # Apply quality adjustment
        adjustment_amount = round(
            base_value * (total_quality_adjustment_pct / 100), 2
        )
        taxable_value = round(base_value + adjustment_amount, 2)

        # Tax calculation (inter vs intra state)
        is_inter_state = (cp_state.strip().lower() != HOME_STATE.lower())

        if is_inter_state:
            igst   = round(taxable_value * IGST_RATE / 100, 2)
            cgst   = 0.0
            sgst   = 0.0
            tax_label = "IGST"
        else:
            igst   = 0.0
            cgst   = round(taxable_value * CGST_RATE / 100, 2)
            sgst   = round(taxable_value * SGST_RATE / 100, 2)
            tax_label = "CGST+SGST"

        total_tax    = round(igst + cgst + sgst, 2)
        total_invoice = round(taxable_value + total_tax, 2)

        # 6. Assemble the invoice payload ---------------------------------
        invoice: Dict[str, Any] = {
            "contract_id":       contract_id,
            "contract_number":   contract.get("contract_number"),
            "type":              contract.get("type"),
            "invoice_date":      date.today().isoformat(),

            # Parties
            "seller": (
                counterparty.get("name") if contract.get("type") == "buy"
                else "TradeNexus Aggregator Pvt Ltd"
            ) if counterparty else "TradeNexus Aggregator Pvt Ltd",
            "buyer": (
                "TradeNexus Aggregator Pvt Ltd"
                if contract.get("type") == "buy"
                else counterparty.get("name", "Unknown")
            ) if counterparty else "Unknown",
            "counterparty_state": cp_state,
            "home_state":        HOME_STATE,

            # Line item
            "commodity":         commodity_name,
            "hsn_code":          hsn_code,
            "quantity":          quantity,
            "unit":              contract.get("unit", "quintal"),
            "price_per_unit":    price_per_unit,
            "base_value":        base_value,

            # Quality
            "quality_lots":          self._format_quality_lots(quality_lots),
            "quality_adjustment_pct": total_quality_adjustment_pct,
            "adjustment_amount":     adjustment_amount,
            "taxable_value":         taxable_value,

            # Tax
            "tax_type":       tax_label,
            "is_inter_state": is_inter_state,
            "igst":           igst,
            "cgst":           cgst,
            "sgst":           sgst,
            "total_tax":      total_tax,
            "gst_rate_pct":   IGST_RATE if is_inter_state else (CGST_RATE + SGST_RATE),

            # Total
            "total_invoice_value": total_invoice,

            # Delivery info
            "delivery_date":     contract.get("delivery_date"),
            "delivery_location": contract.get("delivery_location"),
        }

        logger.info(
            "Invoice generated for contract %s — total ₹%.2f",
            contract_id, total_invoice,
        )
        return invoice

    # ------------------------------------------------------------------
    # Helpers (private)
    # ------------------------------------------------------------------

    async def _fetch_contract(self, contract_id: str) -> Optional[dict]:
        """Retrieve a single contract row by ID."""
        try:
            res = (
                self.sb.table("contracts")
                .select("*")
                .eq("id", contract_id)
                .limit(1)
                .execute()
            )
            return res.data[0] if res.data else None
        except Exception as exc:
            logger.error("Error fetching contract %s: %s", contract_id, exc)
            return None

    async def _resolve_commodity(
        self, commodity_id: Optional[str]
    ) -> tuple[str, str]:
        """Return (canonical_name, hsn_code) for a commodity UUID."""
        name = "Unknown"
        hsn  = "0000"

        if not commodity_id:
            return name, hsn

        try:
            res = (
                self.sb.table("commodities")
                .select("canonical_name")
                .eq("id", commodity_id)
                .limit(1)
                .execute()
            )
            if res.data:
                name = res.data[0]["canonical_name"]
                hsn  = HSN_MAP.get(name, "0000")
        except Exception as exc:
            logger.error("Error resolving commodity %s: %s", commodity_id, exc)

        return name, hsn

    async def _fetch_counterparty(
        self, counterparty_id: Optional[str]
    ) -> Optional[dict]:
        """Retrieve counterparty details (name, state, gstin)."""
        if not counterparty_id:
            return None
        try:
            res = (
                self.sb.table("counterparties")
                .select("name, state, gstin")
                .eq("id", counterparty_id)
                .limit(1)
                .execute()
            )
            return res.data[0] if res.data else None
        except Exception as exc:
            logger.error(
                "Error fetching counterparty %s: %s", counterparty_id, exc
            )
            return None

    async def _fetch_quality_lots(self, contract_id: str) -> List[dict]:
        """Get all quality lot records for a contract."""
        try:
            res = (
                self.sb.table("quality_lots")
                .select("*")
                .eq("contract_id", contract_id)
                .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error(
                "Error fetching quality lots for %s: %s", contract_id, exc
            )
            return []

    @staticmethod
    def _aggregate_quality_adjustment(lots: List[dict]) -> float:
        """
        Average the price_adjustment_pct across all quality lots.
        Returns 0.0 if there are no lots.
        """
        if not lots:
            return 0.0
        adjustments = [
            float(lot.get("price_adjustment_pct") or 0) for lot in lots
        ]
        return round(sum(adjustments) / len(adjustments), 2)

    @staticmethod
    def _format_quality_lots(lots: List[dict]) -> List[dict]:
        """Slim each lot record for the invoice payload."""
        formatted = []
        for lot in lots:
            formatted.append({
                "lot_id":               lot.get("id"),
                "quantity":             lot.get("quantity"),
                "grade":                lot.get("grade"),
                "moisture_pct":         lot.get("moisture_pct"),
                "foreign_matter_pct":   lot.get("foreign_matter_pct"),
                "broken_grains_pct":    lot.get("broken_grains_pct"),
                "price_adjustment_pct": lot.get("price_adjustment_pct"),
                "origin_location":      lot.get("origin_location"),
            })
        return formatted
