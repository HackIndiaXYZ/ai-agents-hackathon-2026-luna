"""
TradeNexus API — Open Positions Router.

Aggregates net long/short exposure per commodity from active contracts.
"""

import logging
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, HTTPException

from core.database import get_client
from agents.risk_agent import RiskAgent

logger = logging.getLogger("positions_router")
router = APIRouter()

_risk_agent: Optional[RiskAgent] = None


def _get_risk_agent() -> RiskAgent:
    global _risk_agent
    if _risk_agent is None:
        _risk_agent = RiskAgent(supabase_client=get_client())
    return _risk_agent


@router.get("/positions")
async def get_open_positions():
    """
    Aggregate open contract exposure by commodity.
    Excludes settled and cancelled contracts.
    """
    try:
        mtm_list = await _get_risk_agent().calculate_mtm()
        active = [
            c for c in mtm_list
            if c.get("status") not in ("settled", "cancelled")
        ]

        grouped: dict = defaultdict(lambda: {
            "commodity": "",
            "total_bought": 0.0,
            "total_sold": 0.0,
            "buy_value_sum": 0.0,
            "sell_value_sum": 0.0,
            "net_pnl": 0.0,
        })

        for c in active:
            comm = c.get("commodity") or c.get("commodity_name") or "Unknown"
            g = grouped[comm]
            g["commodity"] = comm
            qty = float(c.get("quantity") or 0)
            price = float(c.get("contract_price") or c.get("price_per_unit") or 0)
            pnl = float(c.get("unrealized_pnl") or 0)
            ctype = str(c.get("type", "buy")).lower()

            if ctype == "buy":
                g["total_bought"] += qty
                g["buy_value_sum"] += qty * price
            else:
                g["total_sold"] += qty
                g["sell_value_sum"] += qty * price
            g["net_pnl"] += pnl

        positions = []
        for g in grouped.values():
            buy_qty = g["total_bought"]
            sell_qty = g["total_sold"]
            positions.append({
                "commodity": g["commodity"],
                "total_bought": round(buy_qty, 2),
                "total_sold": round(sell_qty, 2),
                "net_position": round(buy_qty - sell_qty, 2),
                "avg_buy_price": round(g["buy_value_sum"] / buy_qty) if buy_qty > 0 else 0,
                "avg_sell_price": round(g["sell_value_sum"] / sell_qty) if sell_qty > 0 else 0,
                "net_pnl": round(g["net_pnl"], 2),
            })

        positions.sort(key=lambda x: abs(x["net_position"]), reverse=True)
        return {"positions": positions, "count": len(positions)}
    except Exception as e:
        logger.error("Error computing open positions: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
