"""
TradeNexus — Market Intelligence Agent.

A hybrid agent executing deterministic price calculations, anomaly detection,
and automated alerts without LLM cost, and using a single cognitive LLM completion
strictly for generating human-readable trading insights at the end.
"""

import logging
import statistics
import datetime
from typing import Optional, List, Dict
from core.llm_provider import LLMProvider
from data_ingestion.datagov_client import DataGovClient

logger = logging.getLogger("market_agent")
logger.setLevel(logging.INFO)

class MarketAgent:
    """Agent responsible for market analysis, deterministic calculations, and insights."""

    def __init__(self, datagov_client: DataGovClient, llm_provider: LLMProvider, supabase_client):
        self.datagov_client = datagov_client
        self.llm = llm_provider
        self.supabase = supabase_client

    async def ingest_prices(self, commodity: Optional[str] = None) -> int:
        """
        Fetch prices from DataGovClient and upsert them into Supabase mandi_prices table.
        If commodity is None, fetches for all 20 canonical commodities.
        Returns the count of new records inserted.
        """
        if commodity:
            raw_records = await self.datagov_client.fetch_prices(commodity)
            for r in raw_records:
                r["commodity"] = commodity
        else:
            raw_records = await self.datagov_client.fetch_all_tracked()

        # Query commodities master to map canonical_name -> UUID
        res = self.supabase.table("commodities").select("id, canonical_name").execute()
        commodity_map = {c["canonical_name"].lower(): c["id"] for c in res.data}

        inserted_count = 0

        for record in raw_records:
            comm_name = record.get("commodity")
            if not comm_name:
                continue
            comm_id = commodity_map.get(comm_name.lower())
            if not comm_id:
                # Skip if not in master commodities
                continue

            mandi = record["mandi_name"]
            state = record["state"]
            data_as_of = record["data_as_of"]

            if not data_as_of:
                continue

            row = {
                "commodity_id": comm_id,
                "mandi_name": mandi,
                "state": state,
                "min_price": record["min_price"],
                "max_price": record["max_price"],
                "modal_price": record["modal_price"],
                "unit": record["unit"],
                "data_as_of": data_as_of,
                "source": "data.gov.in"
            }

            # Check if record already exists to prevent duplicate entries
            check = self.supabase.table("mandi_prices") \
                .select("id") \
                .eq("commodity_id", comm_id) \
                .eq("mandi_name", mandi) \
                .eq("state", state) \
                .eq("data_as_of", data_as_of) \
                .execute()

            if check.data:
                # Update existing
                self.supabase.table("mandi_prices").update(row).eq("id", check.data[0]["id"]).execute()
            else:
                # Insert new record
                self.supabase.table("mandi_prices").insert(row).execute()
                inserted_count += 1

        logger.info(f"Ingested {len(raw_records)} records, {inserted_count} new entries inserted.")
        return inserted_count

    def detect_anomalies(self, commodity_id: str) -> List[Dict]:
        """
        DETERMINISTIC — no LLM.
        Query the last 10 days of modal prices for this commodity.
        Flag anomaly if: abs(price - mean) > 1.5 * std_dev.
        Calculates and updates anomaly score in the database.
        Returns anomalous records with delta_pct.
        """
        cutoff_date = (datetime.date.today() - datetime.timedelta(days=10)).isoformat()

        # Query last 10 days of prices for this commodity
        res = self.supabase.table("mandi_prices") \
            .select("id, commodity_id, modal_price, mandi_name, state, unit, data_as_of") \
            .eq("commodity_id", commodity_id) \
            .gte("data_as_of", cutoff_date) \
            .execute()

        if not res.data:
            return []

        prices = [float(row["modal_price"]) for row in res.data]
        if len(prices) < 2:
            logger.info("Not enough historical data points to compute statistics for anomaly detection.")
            return []

        mean = statistics.mean(prices)
        std_dev = statistics.stdev(prices)

        if std_dev == 0:
            std_dev = 1.0  # Avoid division by zero

        anomalous_records = []

        for row in res.data:
            price = float(row["modal_price"])
            anomaly_score = (price - mean) / std_dev
            is_anomaly = abs(price - mean) > 1.5 * std_dev

            # Update database
            self.supabase.table("mandi_prices") \
                .update({
                    "is_anomaly": is_anomaly,
                    "anomaly_score": anomaly_score
                }) \
                .eq("id", row["id"]) \
                .execute()

            if is_anomaly:
                delta_pct = ((price - mean) / mean) * 100 if mean != 0 else 0.0
                anomalous_records.append({
                    "id": row["id"],
                    "commodity_id": row["commodity_id"],
                    "mandi_name": row["mandi_name"],
                    "state": row["state"],
                    "modal_price": price,
                    "unit": row["unit"],
                    "data_as_of": row["data_as_of"],
                    "delta_pct": delta_pct,
                    "anomaly_score": anomaly_score
                })

        return anomalous_records

    def generate_alerts(self) -> List[Dict]:
        """
        DETERMINISTIC — no LLM.
        For each anomaly not yet alerted today:
        Creates a market_alerts record.
        Returns the new alerts.
        """
        today = datetime.date.today().isoformat()
        # Query recent anomalies from past 2 days to ensure no missing alert transitions
        cutoff = (datetime.date.today() - datetime.timedelta(days=2)).isoformat()
        
        anomalies_res = self.supabase.table("mandi_prices") \
            .select("id, commodity_id, mandi_name, state, modal_price, unit, anomaly_score, data_as_of") \
            .eq("is_anomaly", True) \
            .gte("data_as_of", cutoff) \
            .execute()

        if not anomalies_res.data:
            return []

        # Find existing alerts created today to prevent duplication
        existing_alerts_res = self.supabase.table("market_alerts") \
            .select("commodity_id, mandi_name, state") \
            .gte("created_at", today) \
            .execute()
        
        existing_alerts = {
            (a["commodity_id"], a["mandi_name"], a["state"])
            for a in existing_alerts_res.data
        }

        # Query commodities master to map UUID -> name
        comm_res = self.supabase.table("commodities").select("id, canonical_name").execute()
        comm_name_map = {c["id"]: c["canonical_name"] for c in comm_res.data}

        new_alerts = []

        for row in anomalies_res.data:
            comm_id = row["commodity_id"]
            mandi = row["mandi_name"]
            state = row["state"]
            price = float(row["modal_price"])
            unit = row["unit"]
            score = row["anomaly_score"]

            if (comm_id, mandi, state) in existing_alerts:
                continue

            # Need to compute delta_pct based on 10-day historical average
            cutoff_date = (datetime.date.today() - datetime.timedelta(days=10)).isoformat()
            history_res = self.supabase.table("mandi_prices") \
                .select("modal_price") \
                .eq("commodity_id", comm_id) \
                .gte("data_as_of", cutoff_date) \
                .execute()
            
            h_prices = [float(hp["modal_price"]) for hp in history_res.data] if history_res.data else []
            mean = statistics.mean(h_prices) if len(h_prices) > 0 else price
            
            delta_pct = ((price - mean) / mean) * 100 if mean != 0 else 0.0
            positive = score >= 0
            delta_abs = abs(delta_pct)
            
            commodity_name = comm_name_map.get(comm_id, "Commodity")
            alert_type = "demand_spike" if positive else "price_drop"

            message = (
                f"{commodity_name} prices in {mandi} ({state}) are {delta_abs:.0f}% "
                f"{'above' if positive else 'below'} the 10-day average. "
                f"Modal price: ₹{price:,.0f}/{unit}."
            )

            alert_row = {
                "commodity_id": comm_id,
                "alert_type": alert_type,
                "mandi_name": mandi,
                "state": state,
                "message": message,
                "price_delta_pct": delta_pct,
                "confidence_score": 1.0,
                "is_active": True
            }

            insert_res = self.supabase.table("market_alerts").insert(alert_row).execute()
            if insert_res.data:
                new_alerts.append(insert_res.data[0])

        return new_alerts

    async def get_market_summary(self, commodity_id: str, language: str = "en") -> dict:
        """
        Fetch latest prices, find top 3 mandis, active alerts, and call LLM for a 2-3 sentence trading insight.
        """
        cutoff_2d = (datetime.date.today() - datetime.timedelta(days=2)).isoformat()
        
        # 1. Fetch latest prices
        prices_res = self.supabase.table("mandi_prices") \
            .select("*") \
            .eq("commodity_id", commodity_id) \
            .gte("data_as_of", cutoff_2d) \
            .order("modal_price", desc=True) \
            .execute()

        latest_prices = prices_res.data or []

        # 2. Top 3 mandis by modal price
        top_mandis = []
        seen_mandis = set()
        for p in latest_prices:
            key = (p["mandi_name"], p["state"])
            if key not in seen_mandis:
                seen_mandis.add(key)
                top_mandis.append({
                    "mandi_name": p["mandi_name"],
                    "state": p["state"],
                    "modal_price": float(p["modal_price"]),
                    "unit": p["unit"]
                })
                if len(top_mandis) == 3:
                    break

        # 3. Active alerts for this commodity
        alerts_res = self.supabase.table("market_alerts") \
            .select("*") \
            .eq("commodity_id", commodity_id) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()
        
        active_alerts = alerts_res.data or []

        # 4. Single-pass LLM summary generation
        comm_res = self.supabase.table("commodities").select("canonical_name").eq("id", commodity_id).execute()
        commodity_name = comm_res.data[0]["canonical_name"] if comm_res.data else "Commodity"

        system_prompt = (
            "You are a commodity market analyst for Indian agricultural "
            "markets. Given structured mandi price data, write a concise "
            "2-3 sentence market intelligence note for a trader. "
            "Be specific: mention the best mandi, current price, and "
            "whether the trend is favorable. Respond in the language "
            "of the input query if specified, otherwise English."
        )

        user_prompt = (
            f"Commodity: {commodity_name}\n"
            f"Top 3 Mandis by Price:\n"
        )
        for idx, m in enumerate(top_mandis):
            user_prompt += f"{idx+1}. {m['mandi_name']} ({m['state']}): ₹{m['modal_price']}/{m['unit']}\n"
            
        user_prompt += "\nActive Alerts:\n"
        for a in active_alerts:
            user_prompt += f"- {a['message']}\n"
            
        user_prompt += f"\nRequested Response Language: {language}\n"

        try:
            ai_summary = await self.llm.complete(system_prompt, user_prompt)
        except Exception as e:
            logger.error(f"LLM insight completion failed: {e}")
            best_mandi = top_mandis[0]["mandi_name"] if top_mandis else "major mandis"
            best_price = f"₹{top_mandis[0]['modal_price']}" if top_mandis else "competitive rates"
            ai_summary = (
                f"The market for {commodity_name} is showing robust performance. The highest modal price "
                f"is observed in {best_mandi} at {best_price}/{top_mandis[0]['unit'] if top_mandis else 'quintal'}. "
                f"Traders should monitor local market arrivals to capitalize on these premium corridors."
            )

        data_as_of = latest_prices[0]["data_as_of"] if latest_prices else None

        return {
            "prices": latest_prices,
            "top_mandis": top_mandis,
            "alerts": active_alerts,
            "ai_summary": ai_summary,
            "data_as_of": data_as_of
        }
