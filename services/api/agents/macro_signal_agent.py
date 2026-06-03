"""
TradeNexus CTRM — Macro Signal Agent.

Ingests external macro indicators and policy shifts using Qwen/LLMProvider.
Updates daily commodity sentiment signals and links them to open contracts.
"""

import json
import logging
import asyncio
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger("macro_signal_agent")
logger.setLevel(logging.INFO)

TRACKED_COMMODITIES = [
    'Cotton', 'Soybean', 'Pigeon Pea', 'Chickpea',
    'Wheat', 'Onion', 'Groundnut', 'Mustard'
]

class MacroSignalAgent:
    """Agent responsible for analyzing macro sentiments for commodities."""

    def __init__(self, supabase_client, llm_provider):
        self.sb = supabase_client
        self.llm = llm_provider

    async def analyze_commodity_sentiment(self, commodity: str) -> dict:
        """
        Analyze current sentiment for a commodity in India using LLM,
        determine affected open contracts, and upsert a macro_signal entry.
        """
        # Step 1: Query LLM Provider for Sentiment Assessment
        system_prompt = (
            f"You are a commodity market analyst specializing in Indian agricultural markets. "
            f"Based on your knowledge of current market conditions, government policies, and seasonal "
            f"patterns for {commodity} in India, provide a market sentiment assessment. If you have "
            f"knowledge of recent MSP changes, export restrictions, or major weather events affecting this "
            f"commodity, include them.\n\n"
            f"Respond ONLY with a valid JSON object in this exact format (no explanations, no markdown blocks):\n"
            f"{{\n"
            f'  "sentiment": "bullish" | "bearish" | "neutral",\n'
            f'  "confidence": 0.0-1.0,\n'
            f'  "key_signal": "one specific sentence explaining the main factor",\n'
            f'  "price_impact": "upward" | "downward" | "neutral",\n'
            f'  "urgency": "immediate" | "this_week" | "this_month",\n'
            f'  "factors": ["list of up to 3 key factors"]\n'
            f"}}"
        )
        user_prompt = f"Assess current market sentiment for {commodity} in India."

        try:
            content = await self.llm.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expect_json=True,
                max_tokens=400
            )

            # Defensive parsing of JSON (strip markdown blocks if present)
            clean_content = content.strip()
            if clean_content.startswith("```"):
                # strip ```json or ```
                clean_content = re.sub(r"^```(?:json)?\n", "", clean_content)
                clean_content = re.sub(r"\n```$", "", clean_content).strip()
            
            parsed = json.loads(clean_content)
        except Exception as e:
            logger.error(f"Failed to parse LLM response for {commodity}: {e}. Content was: {content if 'content' in locals() else 'None'}")
            # Resilient fallback
            parsed = {
                "sentiment": "neutral",
                "confidence": 0.5,
                "key_signal": f"LLM parsing failed for {commodity}. Defaulting to neutral sentiment.",
                "price_impact": "neutral",
                "urgency": "this_month",
                "factors": ["API communication timeout or formatting mismatch"]
            }

        sentiment = parsed.get("sentiment", "neutral").lower()
        if sentiment not in ["bullish", "bearish", "neutral"]:
            sentiment = "neutral"

        price_impact = parsed.get("price_impact", "neutral").lower()
        if price_impact not in ["upward", "downward", "neutral"]:
            price_impact = "neutral"

        urgency = parsed.get("urgency", "this_month").lower()
        if urgency not in ["immediate", "this_week", "this_month"]:
            urgency = "this_month"

        confidence = float(parsed.get("confidence", 0.5))
        key_signal = parsed.get("key_signal", f"Assessment completed for {commodity}.")
        factors = parsed.get("factors", [])

        # Step 2: Fetch commodity UUID and affected open contracts
        comm_res = self.sb.table("commodities").select("id").eq("canonical_name", commodity).limit(1).execute()
        if not comm_res.data:
            # Try fuzzy match if exact match fails
            comm_res = self.sb.table("commodities").select("id").ilike("canonical_name", f"%{commodity}%").limit(1).execute()
        
        if not comm_res.data:
            logger.warning(f"Commodity '{commodity}' not found in DB commodities table.")
            return parsed

        comm_id = comm_res.data[0]["id"]

        # Fetch open contracts count (not settled, not cancelled)
        contracts_res = self.sb.table("contracts") \
            .select("id") \
            .eq("commodity_id", comm_id) \
            .neq("status", "settled") \
            .neq("status", "cancelled") \
            .execute()
        affected_count = len(contracts_res.data or [])

        # Step 3: Upsert macro_signal for today (one per commodity per day)
        today_str = date.today().isoformat()
        
        row_data = {
            "commodity_id": comm_id,
            "signal_date": today_str,
            "signal_type": "sentiment",
            "sentiment": sentiment,
            "confidence": confidence,
            "urgency": urgency,
            "key_signal": key_signal,
            "price_impact": price_impact,
            "affected_contracts": affected_count,
            "raw_data": {
                "factors": factors,
                "analyzed_at": datetime.now().isoformat()
            }
        }

        try:
            # Query if exists
            dup_check = self.sb.table("macro_signals") \
                .select("id") \
                .eq("commodity_id", comm_id) \
                .eq("signal_date", today_str) \
                .eq("signal_type", "sentiment") \
                .execute()

            if dup_check.data:
                # Update
                self.sb.table("macro_signals") \
                    .update(row_data) \
                    .eq("id", dup_check.data[0]["id"]) \
                    .execute()
                logger.info(f"Updated daily sentiment signal for {commodity} on {today_str}")
            else:
                # Insert
                self.sb.table("macro_signals").insert(row_data).execute()
                logger.info(f"Created daily sentiment signal for {commodity} on {today_str}")
        except Exception as e:
            logger.error(f"Failed to upsert macro_signal for {commodity}: {e}")

        # Return full signal detail
        return {
            "commodity": commodity,
            "commodity_id": comm_id,
            "sentiment": sentiment,
            "confidence": confidence,
            "key_signal": key_signal,
            "price_impact": price_impact,
            "urgency": urgency,
            "factors": factors,
            "affected_contracts": affected_count
        }

    async def run_daily_analysis(self) -> List[dict]:
        """
        Run sentiment analysis for all 8 tracked commodities
        with a concurrency limit of 3 and 2-second staggered delays
        to avoid API rate limiting.
        """
        start_time = datetime.now()
        sem = asyncio.Semaphore(3)

        async def worker(commodity: str, index: int) -> dict:
            async with sem:
                if index > 0:
                    await asyncio.sleep(2.0 * index)
                return await self.analyze_commodity_sentiment(commodity)

        tasks = [worker(comm, idx) for idx, comm in enumerate(TRACKED_COMMODITIES)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful_signals = []
        bullish_count = 0
        bearish_count = 0
        neutral_count = 0

        for r in results:
            if isinstance(r, Exception):
                logger.error(f"Error in macro sentiment worker: {r}")
                continue
            
            successful_signals.append(r)
            s = r.get("sentiment", "neutral")
            if s == "bullish":
                bullish_count += 1
            elif s == "bearish":
                bearish_count += 1
            else:
                neutral_count += 1

        duration = int((datetime.now() - start_time).total_seconds() * 1000)
        n = len(successful_signals)

        # Log activity
        summary_msg = (
            f"Macro Signal Agent analyzed {n} commodities. "
            f"Bullish: {bullish_count}. Bearish: {bearish_count}. Neutral: {neutral_count}."
        )

        try:
            self.sb.table("agent_activity_log").insert({
                "agent_name": "Macro Signal Agent",
                "action_type": "daily_analysis",
                "summary": summary_msg,
                "detail": {
                    "commodities_count": n,
                    "bullish": bullish_count,
                    "bearish": bearish_count,
                    "neutral": neutral_count,
                    "duration_ms": duration
                },
                "contracts_affected": sum(r.get("affected_contracts", 0) for r in successful_signals),
                "duration_ms": duration
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log Macro Signal Agent activity: {e}")

        return successful_signals
