"""
TradeNexus — Dispatch Intelligence Agent (Deterministic).

Computes logistics utility, maps directions via Google Routes API v2,
queries database corridors/reports, and derives route delay risk and confidence.
Enforces a zero-LLM boundary.
"""

from typing import Dict, Any, Optional
import os
import httpx
import logging
from datetime import datetime, timezone, timedelta
from core.config import get_settings
from core.database import get_supabase_client

logger = logging.getLogger("dispatch_agent")
logger.setLevel(logging.INFO)


class DispatchAgent:
    """Agent responsible for deterministic corridor scoring."""

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or get_supabase_client()
        settings = get_settings()
        self.api_key = os.getenv("GOOGLE_MAPS_API_KEY") or settings.GOOGLE_ROUTES_API_KEY

    async def score_corridor(self, origin: str, destination: str) -> dict:
        """
        Score a corridor between an origin and destination mandi.
        Does not use an LLM.

        1. Query trade_corridors for this origin/destination pair
        2. Call Google Routes API (or fall back to deterministic hash)
        3. Parse duration
        4. Compute reliability score using delays + maps ratio
        5. Derive delay risk category
        """
        origin_clean = origin.strip()
        destination_clean = destination.strip()

        # Step 1: Query trade_corridors for this origin/destination pair
        corridor = None
        corridor_id = None
        typical_duration_hours = 10.0
        base_reliability = 0.7

        try:
            # Case-insensitive checks
            res = self.supabase.table("trade_corridors") \
                .select("*") \
                .ilike("origin_region", origin_clean) \
                .ilike("destination_region", destination_clean) \
                .execute()
            
            if res.data:
                corridor = res.data[0]
            else:
                # Check for reverse corridor as fallback
                res_rev = self.supabase.table("trade_corridors") \
                    .select("*") \
                    .ilike("origin_region", destination_clean) \
                    .ilike("destination_region", origin_clean) \
                    .execute()
                if res_rev.data:
                    corridor = res_rev.data[0]
        except Exception as exc:
            logger.error(f"Error querying trade_corridors for {origin_clean}->{destination_clean}: {exc}")

        if corridor:
            corridor_id = corridor.get("id")
            typical_duration_hours = float(corridor.get("typical_duration_hours") or 10.0)
            base_reliability = float(corridor.get("reliability_score") or 0.7)

        # Step 2: Call Google Routes API
        distance_km = 0.0
        estimated_hours = 0.0
        source = "deterministic_fallback"

        if self.api_key:
            url = "https://routes.googleapis.com/directions/v2:computeRoutes"
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
            }
            body = {
                "origin": {"address": f"{origin_clean}, India"},
                "destination": {"address": f"{destination_clean}, India"},
                "travelMode": "DRIVE",
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, headers=headers, json=body)
                    if response.status_code == 200:
                        data = response.json()
                        if "routes" in data and len(data["routes"]) > 0:
                            route = data["routes"][0]
                            duration_str = route.get("duration", "0s")
                            # duration is e.g. "3600s" or "3600.5s"
                            seconds = float(duration_str.rstrip("s"))
                            estimated_hours = round(seconds / 3600.0, 2)
                            distance_meters = float(route.get("distanceMeters", 0))
                            distance_km = round(distance_meters / 1000.0, 2)
                            source = "google_routes_v2"
            except Exception as e:
                logger.error(f"Error calling Google Routes API: {e}")

        # Step 3: Fallback calculation
        if source == "deterministic_fallback":
            if corridor:
                distance_km = float(corridor.get("distance_km") or 500.0)
                estimated_hours = float(corridor.get("typical_duration_hours") or 10.0)
            else:
                # Generate deterministic values based on char sum
                sum_chars = sum(ord(c) for c in (origin_clean.lower() + destination_clean.lower()))
                distance_km = float((sum_chars % 800) + 150)  # 150km to 950km
                estimated_hours = round(distance_km / 55.0, 2)  # ~55 km/h average truck speed

        # Ensure we have a valid typical duration hours
        if not corridor:
            typical_duration_hours = estimated_hours

        # Step 4: Compute reliability score
        # base = corridor.reliability_score
        base = base_reliability

        # recent_delays = query corridor_reports last 14 days
        recent_delays = []
        if corridor_id:
            try:
                cutoff_14d = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
                reports_res = self.supabase.table("corridor_reports") \
                    .select("*") \
                    .eq("corridor_id", corridor_id) \
                    .gte("reported_at", cutoff_14d) \
                    .execute()
                recent_delays = reports_res.data or []
            except Exception as exc:
                logger.error(f"Error querying corridor reports: {exc}")

        # delay_factor = min(len(recent_delays) * 0.05, 0.3)
        delay_factor = min(len(recent_delays) * 0.05, 0.3)

        # maps_ratio = actual_hours / corridor.typical_duration_hours
        if typical_duration_hours > 0:
            maps_ratio = estimated_hours / typical_duration_hours
        else:
            maps_ratio = 1.0

        # maps_factor = max(0, (maps_ratio - 1.0) * 0.2)
        maps_factor = max(0.0, (maps_ratio - 1.0) * 0.2)

        # final_score = max(0.1, base - delay_factor - maps_factor)
        final_score = max(0.1, base - delay_factor - maps_factor)
        final_score = round(final_score, 3)

        # Step 5: Derive delay_risk
        # > 0.75 -> "low"
        # 0.5-0.75 -> "medium"
        # < 0.5 -> "high"
        if final_score > 0.75:
            delay_risk = "low"
        elif final_score >= 0.5:
            delay_risk = "medium"
        else:
            delay_risk = "high"

        return {
            "origin": origin_clean,
            "destination": destination_clean,
            "distance_km": float(distance_km),
            "estimated_hours": float(estimated_hours),
            "confidence_score": float(final_score),
            "delay_risk": delay_risk,
            "recent_reports_count": len(recent_delays),
            "typical_hours": float(typical_duration_hours)
        }
