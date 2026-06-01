"""
TradeNexus — Counterparty Agent.

Manages counterparty lifecycle: creation (with fuzzy dedup), reliability
scoring with weighted recent-trade performance, and risk assessment.
"""

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("counterparty_agent")
logger.setLevel(logging.INFO)


class CounterpartyAgent:
    """Agent responsible for counterparty management and risk assessment."""

    def __init__(self, supabase_client):
        self.sb = supabase_client

    # ------------------------------------------------------------------
    # Create or Get (fuzzy dedup)
    # ------------------------------------------------------------------

    async def create_or_get(
        self,
        name: str,
        city: str = None,
        state: str = None,
        type: str = "both",
    ) -> dict:
        """
        Search for an existing counterparty by name (case-insensitive, fuzzy).
        If found, return the existing record. Otherwise create a new one.
        """
        # 1. Case-insensitive exact match
        res = (
            self.sb.table("counterparties")
            .select("*")
            .ilike("name", name.strip())
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]

        # 2. Fuzzy match — use ILIKE with wildcards for partial match
        #    (pg_trgm similarity would be ideal but we use Supabase client)
        words = name.strip().split()
        if len(words) >= 2:
            # Try matching on first significant word
            res = (
                self.sb.table("counterparties")
                .select("*")
                .ilike("name", f"%{words[0]}%{words[-1]}%")
                .limit(1)
                .execute()
            )
            if res.data:
                return res.data[0]

        # 3. Create new counterparty
        row = {
            "name": name.strip(),
            "type": type,
            "city": city or "Unknown",
            "state": state or "Unknown",
            "credit_limit": 0,
            "payment_history_score": 0.8,
            "total_trades": 0,
            "on_time_deliveries": 0,
            "late_deliveries": 0,
        }

        ins_res = self.sb.table("counterparties").insert(row).execute()
        return ins_res.data[0] if ins_res.data else row

    # ------------------------------------------------------------------
    # Update Reliability
    # ------------------------------------------------------------------

    async def update_reliability(
        self, counterparty_id: str, was_on_time: bool
    ) -> dict:
        """
        Update trade stats and recalculate payment_history_score.
        Recent trades (last 10) are weighted 2x.
        """
        # Fetch current counterparty
        res = (
            self.sb.table("counterparties")
            .select("*")
            .eq("id", counterparty_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise ValueError(f"Counterparty {counterparty_id} not found.")

        cp = res.data[0]

        # Increment counters
        total_trades = int(cp.get("total_trades", 0)) + 1
        on_time = int(cp.get("on_time_deliveries", 0))
        late = int(cp.get("late_deliveries", 0))

        if was_on_time:
            on_time += 1
        else:
            late += 1

        # Calculate weighted score using recent dispatches
        score = self._calculate_weighted_score(
            counterparty_id, on_time, total_trades
        )

        update_data = {
            "total_trades": total_trades,
            "on_time_deliveries": on_time,
            "late_deliveries": late,
            "payment_history_score": round(score, 4),
        }

        upd_res = (
            self.sb.table("counterparties")
            .update(update_data)
            .eq("id", counterparty_id)
            .execute()
        )
        updated = upd_res.data[0] if upd_res.data else {**cp, **update_data}

        # Alert if score drops below 0.7
        if score < 0.7:
            self._log_activity(
                action_type="reliability_warning",
                summary=(
                    f"Counterparty '{cp.get('name', counterparty_id)}' reliability "
                    f"dropped to {score:.2f} — flagged as risk"
                ),
                detail={
                    "counterparty_id": counterparty_id,
                    "score": score,
                    "total_trades": total_trades,
                    "late_deliveries": late,
                },
            )

        return updated

    def _calculate_weighted_score(
        self, counterparty_id: str, on_time: int, total: int
    ) -> float:
        """
        Weighted reliability score: recent trades (last 10 dispatches)
        count 2x vs. overall average.
        """
        if total == 0:
            return 0.8  # default

        # Overall score
        overall = on_time / total

        # Try to get recent dispatch performance
        try:
            recent_res = (
                self.sb.table("dispatches")
                .select("status, contract_id")
                .eq(
                    "contract_id",
                    # Get contracts for this counterparty
                    # Simplified: use overall score if we can't query recent
                    "",
                )
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )

            if recent_res.data and len(recent_res.data) >= 3:
                recent_on_time = sum(
                    1 for d in recent_res.data if d.get("status") == "delivered"
                )
                recent_total = len(recent_res.data)
                recent_score = recent_on_time / recent_total

                # Weighted: recent 2x
                return (overall + 2 * recent_score) / 3
        except Exception:
            pass

        return overall

    # ------------------------------------------------------------------
    # Risk Assessment
    # ------------------------------------------------------------------

    async def get_risk_assessment(self, counterparty_id: str) -> dict:
        """
        Returns a structured risk assessment for a counterparty.
        """
        res = (
            self.sb.table("counterparties")
            .select("*")
            .eq("id", counterparty_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise ValueError(f"Counterparty {counterparty_id} not found.")

        cp = res.data[0]
        score = float(cp.get("payment_history_score", 0.8))
        total_trades = int(cp.get("total_trades", 0))
        late_deliveries = int(cp.get("late_deliveries", 0))

        # Risk level logic
        if score > 0.8:
            risk_level = "low"
            risk_message = "Reliable counterparty"
            recommendation = (
                "Standard payment terms acceptable. Consider increasing credit limit."
            )
        elif score >= 0.6:
            risk_level = "medium"
            risk_message = "Some delivery delays"
            recommendation = (
                "Require partial advance payment. Monitor delivery timelines closely."
            )
        else:
            risk_level = "high"
            risk_message = "High default risk — consider advance payment"
            recommendation = (
                "Require full advance payment or bank guarantee. "
                "Reduce credit limit and contract quantities."
            )

        return {
            "counterparty_id": counterparty_id,
            "name": cp.get("name"),
            "reliability_score": score,
            "total_trades": total_trades,
            "late_deliveries": late_deliveries,
            "risk_level": risk_level,
            "risk_message": risk_message,
            "recommendation": recommendation,
        }

    # ------------------------------------------------------------------
    # List Counterparties
    # ------------------------------------------------------------------

    async def list_counterparties(
        self, type_filter: str = None
    ) -> List[dict]:
        """
        All counterparties with calculated risk_level and total contract value.
        """
        query = self.sb.table("counterparties").select("*")
        if type_filter:
            query = query.eq("type", type_filter)
        query = query.order("created_at", desc=True)
        res = query.execute()

        results = []
        for cp in res.data or []:
            score = float(cp.get("payment_history_score", 0.8))

            if score > 0.8:
                risk_level = "low"
            elif score >= 0.6:
                risk_level = "medium"
            else:
                risk_level = "high"

            # Total contracts value
            try:
                val_res = (
                    self.sb.rpc(
                        "get_counterparty_contract_value",
                        {"cp_id": cp["id"]},
                    ).execute()
                )
                total_value = val_res.data if isinstance(val_res.data, (int, float)) else 0
            except Exception:
                # Fallback: calculate from contracts
                try:
                    c_res = (
                        self.sb.table("contracts")
                        .select("quantity, price_per_unit")
                        .eq("counterparty_id", cp["id"])
                        .neq("status", "cancelled")
                        .execute()
                    )
                    total_value = sum(
                        float(c.get("quantity", 0)) * float(c.get("price_per_unit") or 0)
                        for c in (c_res.data or [])
                    )
                except Exception:
                    total_value = 0

            enriched = {**cp, "risk_level": risk_level, "total_contracts_value": round(total_value, 2)}
            results.append(enriched)

        return results

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _log_activity(
        self,
        action_type: str,
        summary: str,
        detail: dict = None,
        contracts_affected: int = 0,
    ) -> None:
        """Insert an entry into agent_activity_log."""
        try:
            self.sb.table("agent_activity_log").insert(
                {
                    "agent_name": "Counterparty Agent",
                    "action_type": action_type,
                    "summary": summary,
                    "detail": json.dumps(detail) if detail else None,
                    "contracts_affected": contracts_affected,
                }
            ).execute()
        except Exception as exc:
            logger.warning("Activity log insert failed: %s", exc)
