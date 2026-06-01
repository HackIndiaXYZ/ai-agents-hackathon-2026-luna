"""
TradeNexus CTRM — Risk Agent.

Purely deterministic analytical agent responsible for portfolio Mark-to-Market (MtM),
risk alerts, and concentration assessment. Zero LLM dependencies.
"""

import logging
import json
from datetime import date, timedelta, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger("risk_agent")
logger.setLevel(logging.INFO)


class RiskAgent:
    """CTRM Analytical Agent for deterministic risk, exposure, and MtM calculations."""

    def __init__(self, supabase_client):
        self.sb = supabase_client

    # ------------------------------------------------------------------
    # Mark-to-Market (MtM) Valuations
    # ------------------------------------------------------------------

    async def calculate_mtm(self, contract_id: str = None) -> List[dict]:
        """
        Calculate today's MtM valuation for a specific contract or all open contracts.
        Updates/upserts pnl_snapshots and logs activity.
        """
        # 1. Fetch contracts
        query = self.sb.table("contracts").select(
            "*, commodities(id, canonical_name), counterparties(id, name)"
        )
        if contract_id:
            is_uuid = False
            try:
                from uuid import UUID
                UUID(contract_id)
                is_uuid = True
            except ValueError:
                is_uuid = False

            if is_uuid:
                query = query.eq("id", contract_id)
            else:
                query = query.eq("contract_number", contract_id)
        else:
            query = query.neq("status", "settled").neq("status", "cancelled")

        res = query.execute()
        contracts = res.data or []

        results = []
        commodity_prices_cache = {}
        commodity_as_of_cache = {}

        for c in contracts:
            comm_id = c.get("commodity_id")
            if not comm_id:
                continue

            # Resolve market price with cache optimization
            if comm_id in commodity_prices_cache:
                market_price = commodity_prices_cache[comm_id]
                data_as_of = commodity_as_of_cache[comm_id]
            else:
                p_res = (
                    self.sb.table("mandi_prices")
                    .select("mandi_name, state, modal_price, data_as_of")
                    .eq("commodity_id", comm_id)
                    .order("data_as_of", desc=True)
                    .execute()
                )

                unique_mandis = []
                seen = set()
                for p in p_res.data or []:
                    key = (p["mandi_name"], p["state"])
                    if key not in seen:
                        seen.add(key)
                        unique_mandis.append(p)
                        if len(unique_mandis) == 5:
                            break

                if not unique_mandis:
                    market_price = 5000.0  # Fallback default price
                    data_as_of = date.today().isoformat()
                else:
                    # Weighted average of top 5 mandis by volume/recency proxy
                    weights = [0.4, 0.25, 0.15, 0.1, 0.1]
                    n_mandis = len(unique_mandis)
                    active_weights = weights[:n_mandis]
                    total_w = sum(active_weights)
                    norm_weights = [w / total_w for w in active_weights]

                    weighted_sum = sum(
                        float(m["modal_price"]) * w
                        for m, w in zip(unique_mandis, norm_weights)
                    )
                    market_price = round(weighted_sum, 2)
                    data_as_of = unique_mandis[0]["data_as_of"]

                commodity_prices_cache[comm_id] = market_price
                commodity_as_of_cache[comm_id] = data_as_of

            # 2. Effective contract price
            price_type = c.get("price_type") or "fixed"
            quantity = float(c.get("quantity") or 0)

            if price_type == "fixed":
                contract_price = float(c.get("price_per_unit") or 0)
            else:  # formula
                premium_pct = float(c.get("formula_premium_pct") or 0)
                contract_price = round(market_price * (1 + premium_pct / 100.0), 2)

            # 3. P&L computations
            ctype = c.get("type") or "buy"
            if ctype == "sell":
                unrealized_pnl = (contract_price - market_price) * quantity
            else:  # buy
                unrealized_pnl = (market_price - contract_price) * quantity

            denom = contract_price * quantity
            pnl_pct = round((unrealized_pnl / denom) * 100.0, 4) if denom > 0 else 0.0
            real_pnl = round(unrealized_pnl, 2)

            # 4. Upsert snapshot into DB
            snapshot_row = {
                "contract_id": c["id"],
                "snapshot_date": date.today().isoformat(),
                "contract_price": contract_price,
                "market_price": market_price,
                "quantity": quantity,
                "unrealized_pnl": real_pnl,
                "pnl_pct": pnl_pct,
            }

            try:
                self.sb.table("pnl_snapshots").upsert(
                    snapshot_row, on_conflict="contract_id,snapshot_date"
                ).execute()
            except Exception as e:
                logger.warning("PnL snapshot upsert failed for contract %s: %s", c["id"], e)

            # Enrich and append
            comm_obj = c.get("commodities")
            comm_name = comm_obj.get("canonical_name") if comm_obj else "Unknown"
            cp_obj = c.get("counterparties")
            cp_name = cp_obj.get("name") if cp_obj else "Unknown"

            results.append(
                {
                    "contract_id": c["id"],
                    "contract_number": c["contract_number"],
                    "commodity": comm_name,
                    "commodity_id": comm_id,
                    "counterparty": cp_name,
                    "type": ctype,
                    "quantity": quantity,
                    "contract_price": contract_price,
                    "market_price": market_price,
                    "unrealized_pnl": real_pnl,
                    "pnl_pct": pnl_pct,
                    "data_as_of": data_as_of,
                    "status": c.get("status"),
                }
            )

        # 5. Log batch activity if calculated in batch mode
        n = len(results)
        if not contract_id and n > 0:
            results_sorted = sorted(results, key=lambda x: x["unrealized_pnl"], reverse=True)
            best = results_sorted[0]
            worst = results_sorted[-1]

            best_sign = "+" if best["unrealized_pnl"] >= 0 else ""
            worst_sign = "+" if worst["unrealized_pnl"] >= 0 else ""

            summary = (
                f"MtM calculated for {n} contracts. "
                f"Best: {best['contract_number']} {best_sign}₹{best['unrealized_pnl']:.2f}. "
                f"Worst: {worst['contract_number']} {worst_sign}₹{worst['unrealized_pnl']:.2f}."
            )

            self._log_activity(
                action_type="mtm_batch_run",
                summary=summary,
                detail={"count": n, "best": best, "worst": worst},
                contracts_affected=n,
            )

        return results

    # ------------------------------------------------------------------
    # Portfolio Risk Summaries
    # ------------------------------------------------------------------

    async def get_portfolio_summary(self) -> dict:
        """
        Compile global portfolio summary, aggregation, winner/losers, and concentration warnings.
        """
        mtm_list = await self.calculate_mtm()

        total_open_contracts = len(mtm_list)
        total_open_value = 0.0
        total_unrealized_pnl = 0.0
        pnl_positive_count = 0
        pnl_negative_count = 0

        biggest_winner = None
        biggest_loser = None

        commodity_exposure = {}
        counterparty_exposure = {}

        for item in mtm_list:
            qty = float(item["quantity"] or 0)
            contract_price = float(item["contract_price"] or 0)
            pnl = float(item["unrealized_pnl"] or 0)

            value = contract_price * qty
            total_open_value += value
            total_unrealized_pnl += pnl

            if pnl > 0:
                pnl_positive_count += 1
            elif pnl < 0:
                pnl_negative_count += 1

            # Track winner/loser
            if biggest_winner is None or pnl > biggest_winner["pnl"]:
                biggest_winner = {
                    "contract_number": item["contract_number"],
                    "commodity": item["commodity"],
                    "pnl": round(pnl, 2),
                }
            if biggest_loser is None or pnl < biggest_loser["pnl"]:
                biggest_loser = {
                    "contract_number": item["contract_number"],
                    "commodity": item["commodity"],
                    "pnl": round(pnl, 2),
                }

            # Exposure aggregations
            comm_name = item["commodity"] or "Unknown"
            commodity_exposure[comm_name] = commodity_exposure.get(comm_name, 0.0) + value

            cp_name = item["counterparty"] or "Unknown"
            counterparty_exposure[cp_name] = counterparty_exposure.get(cp_name, 0.0) + value

        # Concentration risk calculation
        concentration_risk = None
        if total_open_value > 0:
            for comm, val in commodity_exposure.items():
                pct = (val / total_open_value) * 100.0
                if pct > 60.0:
                    concentration_risk = f"Portfolio concentration risk: {comm} is {pct:.1f}%"
                    break

        return {
            "total_open_contracts": total_open_contracts,
            "total_open_value": round(total_open_value, 2),
            "total_unrealized_pnl": round(total_unrealized_pnl, 2),
            "pnl_positive_count": pnl_positive_count,
            "pnl_negative_count": pnl_negative_count,
            "biggest_winner": biggest_winner,
            "biggest_loser": biggest_loser,
            "commodity_exposure": {k: round(v, 2) for k, v in commodity_exposure.items()},
            "counterparty_exposure": {k: round(v, 2) for k, v in counterparty_exposure.items()},
            "concentration_risk": concentration_risk,
        }

    # ------------------------------------------------------------------
    # Automated Risk Violations & Alerts
    # ------------------------------------------------------------------

    async def detect_risk_alerts(self) -> List[dict]:
        """
        Scan open portfolio states for: price volatility, portfolio concentration,
        urgency in delivery dates, and counterparty credit exposures.
        """
        summary = await self.get_portfolio_summary()
        total_open_value = summary["total_open_value"]

        # Fetch active open contracts to find matching ids
        open_contracts_res = (
            self.sb.table("contracts")
            .select("*, commodities(id, canonical_name), counterparties(id, name)")
            .neq("status", "settled")
            .neq("status", "cancelled")
            .execute()
        )
        open_contracts = open_contracts_res.data or []
        new_alerts = []

        commodity_map = {}
        for c in open_contracts:
            comm = c.get("commodities")
            if comm:
                commodity_map[comm["id"]] = comm["canonical_name"]

        # CHECK 1 — Price volatility (7-day range fluctuation > 15%)
        cutoff_7d = (date.today() - timedelta(days=7)).isoformat()
        for comm_id, comm_name in commodity_map.items():
            prices_res = (
                self.sb.table("mandi_prices")
                .select("modal_price")
                .eq("commodity_id", comm_id)
                .gte("data_as_of", cutoff_7d)
                .execute()
            )
            prices = [float(p["modal_price"]) for p in prices_res.data or []]
            if len(prices) >= 2:
                p_min = min(prices)
                p_max = max(prices)
                if p_min > 0:
                    volatility = (p_max - p_min) / p_min
                    if volatility > 0.15:
                        message = (
                            f"High price volatility: {comm_name} "
                            f"(7-day range: ₹{p_min:.0f}-₹{p_max:.0f})"
                        )
                        alert_row = {
                            "commodity_id": comm_id,
                            "alert_type": "risk",
                            "mandi_name": "Portfolio",
                            "state": "System",
                            "message": message,
                            "confidence_score": 0.9,
                            "price_delta_pct": round(volatility * 100, 2),
                            "is_active": True,
                        }
                        ins = self.sb.table("market_alerts").insert(alert_row).execute()
                        if ins.data:
                            new_alerts.append(ins.data[0])

        # CHECK 2 — Concentration risk (Commodity exceeds 60%)
        if total_open_value > 0:
            for comm_name, val in summary["commodity_exposure"].items():
                pct = (val / total_open_value) * 100.0
                if pct > 60.0:
                    comm_id = None
                    for k, v in commodity_map.items():
                        if v == comm_name:
                            comm_id = k
                            break
                    message = (
                        f"Portfolio concentration risk: {comm_name} "
                        f"is {pct:.1f}% of total portfolio value"
                    )
                    alert_row = {
                        "commodity_id": comm_id,
                        "alert_type": "risk",
                        "mandi_name": "Portfolio",
                        "state": "System",
                        "message": message,
                        "confidence_score": 0.9,
                        "price_delta_pct": round(pct, 2),
                        "is_active": True,
                    }
                    ins = self.sb.table("market_alerts").insert(alert_row).execute()
                    if ins.data:
                        new_alerts.append(ins.data[0])

        # CHECK 3 — Delivery deadline (delivery within 3 days, confirmed status)
        for c in open_contracts:
            if c.get("status") == "confirmed" and c.get("delivery_date"):
                try:
                    del_date = date.fromisoformat(c["delivery_date"])
                    days_left = (del_date - date.today()).days
                    if days_left <= 3:
                        message = (
                            f"Dispatch urgency: Contract {c['contract_number']} "
                            f"due {c['delivery_date']} ({days_left} days left)"
                        )
                        alert_row = {
                            "commodity_id": c.get("commodity_id"),
                            "alert_type": "risk",
                            "mandi_name": "Portfolio",
                            "state": "System",
                            "message": message,
                            "confidence_score": 0.9,
                            "is_active": True,
                        }
                        ins = self.sb.table("market_alerts").insert(alert_row).execute()
                        if ins.data:
                            new_alerts.append(ins.data[0])
                except Exception:
                    pass

        # CHECK 4 — Counterparty exposure (Counterparty exceeds 40%)
        if total_open_value > 0:
            for cp_name, val in summary["counterparty_exposure"].items():
                pct = (val / total_open_value) * 100.0
                if pct > 40.0:
                    comm_id = None
                    for c in open_contracts:
                        cp = c.get("counterparties")
                        if cp and cp["name"] == cp_name:
                            comm_id = c.get("commodity_id")
                            break
                    message = (
                        f"Counterparty concentration: {cp_name} "
                        f"holds {pct:.1f}% of total open portfolio value"
                    )
                    alert_row = {
                        "commodity_id": comm_id,
                        "alert_type": "risk",
                        "mandi_name": "Portfolio",
                        "state": "System",
                        "message": message,
                        "confidence_score": 0.9,
                        "price_delta_pct": round(pct, 2),
                        "is_active": True,
                    }
                    ins = self.sb.table("market_alerts").insert(alert_row).execute()
                    if ins.data:
                        new_alerts.append(ins.data[0])

        return new_alerts

    # ------------------------------------------------------------------
    # Full Cycle Recalculation Trigger
    # ------------------------------------------------------------------

    async def run_full_cycle(self) -> dict:
        """
        Execute the full CTRM risk assessment cycle synchronously.
        """
        import time
        start_time = time.perf_counter()

        mtm_results = await self.calculate_mtm()
        alerts_results = await self.detect_risk_alerts()

        duration_ms = int((time.perf_counter() - start_time) * 1000)

        summary = (
            f"Risk cycle completed. MtM calculated for {len(mtm_results)} contracts. "
            f"Detected and created {len(alerts_results)} risk alerts."
        )

        self._log_activity(
            action_type="risk_cycle_run",
            summary=summary,
            detail={
                "contracts_count": len(mtm_results),
                "alerts_count": len(alerts_results),
                "duration_ms": duration_ms,
            },
            contracts_affected=len(mtm_results),
            duration_ms=duration_ms,
        )

        return {
            "contracts_calculated": len(mtm_results),
            "alerts_created": len(alerts_results),
            "duration_ms": duration_ms,
        }

    # ------------------------------------------------------------------
    # Helper Logging
    # ------------------------------------------------------------------

    def _log_activity(
        self,
        action_type: str,
        summary: str,
        detail: dict = None,
        contracts_affected: int = 0,
        duration_ms: int = None,
    ) -> None:
        """Insert a trace into agent_activity_log (fire-and-forget)."""
        try:
            self.sb.table("agent_activity_log").insert(
                {
                    "agent_name": "Risk Agent",
                    "action_type": action_type,
                    "summary": summary,
                    "detail": json.dumps(detail) if detail else None,
                    "contracts_affected": contracts_affected,
                    "duration_ms": duration_ms,
                }
            ).execute()
        except Exception as exc:
            logger.warning("Risk activity log insert failed: %s", exc)
