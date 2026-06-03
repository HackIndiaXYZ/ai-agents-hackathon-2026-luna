"""
TradeNexus CTRM — Weather Risk Agent.

Queries weather forecasts from Open-Meteo and flags transit or delivery risks.
Creates macro weather risk signals and suggests alternative routes.
"""

import httpx
import logging
from datetime import date, timedelta, datetime
from typing import Any, Dict, List, Optional
from agents.dispatch_agent import DispatchAgent

logger = logging.getLogger("weather_agent")
logger.setLevel(logging.INFO)

CORRIDOR_COORDINATES = {
    "Vidarbha": (20.93, 77.75),
    "Nagpur": (21.15, 79.09),
    "Pune": (18.52, 73.86),
    "Mumbai": (19.08, 72.88),
    "Latur": (18.40, 76.56),
    "Indore": (22.72, 75.86),
    "Bhopal": (23.26, 77.41),
    "Ahmedabad": (23.03, 72.58),
    "Surat": (21.17, 72.83),
    "Delhi": (28.61, 77.21),
    "Ludhiana": (30.90, 75.85),
    "Amravati": (20.93, 77.75),
    "Akola": (20.71, 77.00),
    "Nashik": (20.01, 73.79),
    "Solapur": (17.68, 75.90),
    "Aurangabad": (19.88, 75.34),
    "Kolhapur": (16.70, 74.24),
    "Jalgaon": (21.01, 75.56),
    "Wardha": (20.74, 78.60),
    "Hyderabad": (17.39, 78.49)
}

class WeatherAgent:
    """Agent responsible for weather ingestion and dispatch risk analysis."""

    def __init__(self, supabase_client):
        self.sb = supabase_client
        self.dispatch_agent = DispatchAgent(supabase_client=self.sb)

    async def get_forecast(self, region: str) -> dict:
        """
        Lookup coordinates for region (case-insensitive) and call Open-Meteo API.
        Assess daily risks and return maximum risk score.
        """
        region_clean = region.strip()
        region_key = next((k for k in CORRIDOR_COORDINATES if k.lower() == region_clean.lower()), None)
        
        if not region_key:
            logger.warning(f"Region '{region}' coordinates not found. Using Nagpur as fallback.")
            lat, lng = CORRIDOR_COORDINATES["Nagpur"]
            region_name = region_clean
        else:
            lat, lng = CORRIDOR_COORDINATES[region_key]
            region_name = region_key

        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lng,
            "daily": "precipitation_sum,weathercode,windspeed_10m_max",
            "forecast_days": 7,
            "timezone": "Asia/Kolkata"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch weather forecast for {region_name}: {e}")
            # Resilient fallback with zeroed out metrics
            return {
                "region": region_name,
                "forecast": [],
                "max_risk_score": 0.0,
                "risk_days": []
            }

        daily = data.get("daily", {})
        times = daily.get("time", [])
        precips = daily.get("precipitation_sum", [])
        codes = daily.get("weathercode", [])
        winds = daily.get("windspeed_10m_max", [])

        forecast_list = []
        risk_days = []
        max_risk_score = 0.0

        for i in range(len(times)):
            d_str = times[i]
            precip = float(precips[i]) if precips[i] is not None else 0.0
            code = int(codes[i]) if codes[i] is not None else 0
            wind = float(winds[i]) if winds[i] is not None else 0.0

            # Calculate risk score
            risk_score = 0.0
            descriptions = []

            # WMO Weather codes mapping
            if 95 <= code <= 99:
                risk_score += 0.4
                descriptions.append("Thunderstorm")
            elif 65 <= code <= 67:
                risk_score += 0.35
                descriptions.append("Heavy Rain")
            elif 55 <= code <= 57:
                risk_score += 0.1
                descriptions.append("Drizzle")
            elif 71 <= code <= 77:
                risk_score += 0.2
                descriptions.append("Snow / Winter precipitation")

            if precip > 50.0:
                risk_score += 0.25
                descriptions.append("Heavy Precipitation (>50mm)")

            if wind > 60.0:
                risk_score += 0.2
                descriptions.append("High Winds (>60km/h)")

            risk_score = round(risk_score, 2)
            max_risk_score = max(max_risk_score, risk_score)

            forecast_list.append({
                "date": d_str,
                "precip_mm": precip,
                "weathercode": code,
                "windspeed": wind,
                "risk_score": risk_score
            })

            if risk_score > 0.0:
                risk_days.append({
                    "date": d_str,
                    "risk_score": risk_score,
                    "description": ", ".join(descriptions) if descriptions else "Minor weather hazard"
                })

        return {
            "region": region_name,
            "forecast": forecast_list,
            "max_risk_score": max_risk_score,
            "risk_days": risk_days
        }

    async def scan_active_dispatches(self) -> List[dict]:
        """
        Query all dispatches WHERE status = 'in_transit'.
        Check weather risks and create macro_signal.
        Check alternative corridors via dispatch_agent if risk > 0.4.
        """
        res = self.sb.table("dispatches") \
            .select("*, contracts(commodity_id)") \
            .eq("status", "in_transit") \
            .execute()
        
        dispatches = res.data or []
        created_signals = []

        for d in dispatches:
            origin = d.get("origin")
            dest = d.get("destination")
            dispatch_num = d.get("dispatch_number")
            est_arrival_str = d.get("estimated_arrival")
            
            if not origin or not dest or not est_arrival_str:
                continue

            try:
                est_arrival = date.fromisoformat(est_arrival_str)
            except Exception:
                est_arrival = date.today() + timedelta(days=7)

            # Get forecast for origin and destination
            origin_weather = await self.get_forecast(origin)
            dest_weather = await self.get_forecast(dest)

            # Check both origin and destination regions for risk days before or on estimated arrival
            for region_weather in [origin_weather, dest_weather]:
                region = region_weather["region"]
                risk_days = region_weather["risk_days"]
                
                for rday in risk_days:
                    try:
                        rdate = date.fromisoformat(rday["date"])
                    except Exception:
                        continue

                    # Trigger signal only if risk_date is before or on estimated_arrival and score > 0.4
                    if rdate <= est_arrival and rday["risk_score"] > 0.4:
                        risk_score = rday["risk_score"]
                        risk_date = rday["date"]
                        estimated_delay = int(risk_score * 24)

                        # Determine urgency
                        days_diff = (rdate - date.today()).days
                        urgency = "immediate" if days_diff <= 2 else "this_week"

                        # Retrieve commodity_id from the contract
                        contract_info = d.get("contracts") or {}
                        commodity_id = contract_info.get("commodity_id")

                        key_sig = (
                            f"Heavy rain/storm forecast for {region} on {risk_date}. "
                            f"Dispatch {dispatch_num} ({origin}→{dest}) may face {estimated_delay} hour delay."
                        )

                        # Check alternative corridors
                        alternative_info = None
                        alt_res = await self.sb.table("trade_corridors") \
                            .select("*") \
                            .ilike("destination_region", dest) \
                            .execute()
                        
                        alternatives = alt_res.data or []
                        current_corridor_id = d.get("corridor_id")
                        
                        # Filter out current corridor if exists
                        if current_corridor_id:
                            alternatives = [a for a in alternatives if str(a["id"]) != str(current_corridor_id)]

                        better_alt = None
                        if alternatives:
                            # Evaluate alternative corridors using dispatch_agent
                            for alt in alternatives:
                                alt_origin = alt.get("origin_region")
                                # Skip if same origin, we want different route/origin or if same origin is configured under a different corridor
                                if alt_origin.lower() == origin.lower() and current_corridor_id:
                                    continue
                                
                                score_res = await self.dispatch_agent.score_corridor(alt_origin, dest)
                                # A corridor is better if it is low risk and has high confidence/reliability
                                if score_res.get("delay_risk") == "low" and score_res.get("confidence_score", 0) > 0.7:
                                    better_alt = {
                                        "corridor_id": alt["id"],
                                        "origin": alt_origin,
                                        "destination": dest,
                                        "reliability_score": score_res.get("confidence_score"),
                                        "delay_risk": score_res.get("delay_risk")
                                    }
                                    break

                        if better_alt:
                            alternative_info = better_alt
                            key_sig += f" Better alternative route exists from {better_alt['origin']} to {dest} via corridor {better_alt['corridor_id']}."

                        # Build signal dict
                        signal_data = {
                            "commodity_id": commodity_id,
                            "signal_date": date.today().isoformat(),
                            "signal_type": "weather_risk",
                            "sentiment": "neutral",
                            "confidence": risk_score,
                            "urgency": urgency,
                            "key_signal": key_sig,
                            "price_impact": "neutral",
                            "affected_contracts": 1,
                            "raw_data": {
                                "dispatch_id": d["id"],
                                "dispatch_number": dispatch_num,
                                "region": region,
                                "weather_risk_score": risk_score,
                                "weather_description": rday["description"],
                                "alternative_corridor": alternative_info
                            }
                        }

                        # Upsert / insert the signal
                        # Avoid duplicates: check if weather risk signal for this dispatch on this date already exists
                        dup_check = self.sb.table("macro_signals") \
                            .select("id") \
                            .eq("signal_type", "weather_risk") \
                            .eq("signal_date", signal_data["signal_date"]) \
                            .contains("raw_data", {"dispatch_id": d["id"], "region": region}) \
                            .execute()

                        if dup_check.data:
                            # Update existing
                            self.sb.table("macro_signals") \
                                .update(signal_data) \
                                .eq("id", dup_check.data[0]["id"]) \
                                .execute()
                            logger.info(f"Updated weather risk signal for dispatch {dispatch_num} in {region}")
                        else:
                            # Insert new
                            ins = self.sb.table("macro_signals").insert(signal_data).execute()
                            if ins.data:
                                created_signals.append(ins.data[0])
                            logger.info(f"Created weather risk signal for dispatch {dispatch_num} in {region}")

        return created_signals

    async def run_daily_scan(self) -> dict:
        """
        Execute weather scan across active dispatches and check contracts due this week.
        Log activity and return summary.
        """
        start_time = datetime.now()
        
        # 1. Scan active dispatches
        dispatch_signals = await self.scan_active_dispatches()
        
        # Get count of active dispatches
        disp_res = self.sb.table("dispatches").select("id").eq("status", "in_transit").execute()
        in_transit_count = len(disp_res.data or [])
        
        # 2. Check contracts due this week (next 7 days)
        today = date.today()
        week_later = today + timedelta(days=7)
        
        contracts_res = self.sb.table("contracts") \
            .select("*, commodities(canonical_name)") \
            .eq("status", "confirmed") \
            .gte("delivery_date", today.isoformat()) \
            .lte("delivery_date", week_later.isoformat()) \
            .execute()
        
        contracts = contracts_res.data or []
        contract_signals_count = 0
        contracts_affected_count = 0

        for c in contracts:
            location = c.get("delivery_location")
            if not location:
                continue

            weather = await self.get_forecast(location)
            # Find any risk day where risk > 0.4 before or on delivery_date
            try:
                del_date = date.fromisoformat(c["delivery_date"])
            except Exception:
                continue

            highest_risk_day = None
            for rday in weather["risk_days"]:
                try:
                    rdate = date.fromisoformat(rday["date"])
                except Exception:
                    continue
                
                if rdate <= del_date and rday["risk_score"] > 0.4:
                    if highest_risk_day is None or rday["risk_score"] > highest_risk_day["risk_score"]:
                        highest_risk_day = rday

            if highest_risk_day:
                risk_score = highest_risk_day["risk_score"]
                risk_date = highest_risk_day["date"]
                days_diff = (date.fromisoformat(risk_date) - today).days
                urgency = "immediate" if days_diff <= 2 else "this_week"
                
                comm_name = c.get("commodities", {}).get("canonical_name", "Commodity")
                key_sig = (
                    f"Weather risk forecast ({highest_risk_day['description']}) for delivery location {location} "
                    f"on {risk_date}. Contract {c['contract_number']} ({comm_name}) delivery may be affected."
                )

                signal_data = {
                    "commodity_id": c.get("commodity_id"),
                    "signal_date": today.isoformat(),
                    "signal_type": "weather_risk",
                    "sentiment": "neutral",
                    "confidence": risk_score,
                    "urgency": urgency,
                    "key_signal": key_sig,
                    "price_impact": "neutral",
                    "affected_contracts": 1,
                    "raw_data": {
                        "contract_id": c["id"],
                        "contract_number": c["contract_number"],
                        "location": location,
                        "weather_risk_score": risk_score,
                        "weather_description": highest_risk_day["description"]
                    }
                }

                # Check duplicates
                dup_check = self.sb.table("macro_signals") \
                    .select("id") \
                    .eq("signal_type", "weather_risk") \
                    .eq("signal_date", signal_data["signal_date"]) \
                    .contains("raw_data", {"contract_id": c["id"]}) \
                    .execute()

                if dup_check.data:
                    self.sb.table("macro_signals") \
                        .update(signal_data) \
                        .eq("id", dup_check.data[0]["id"]) \
                        .execute()
                else:
                    self.sb.table("macro_signals").insert(signal_data).execute()
                    contract_signals_count += 1
                
                contracts_affected_count += 1

        duration = int((datetime.now() - start_time).total_seconds() * 1000)
        total_signals = len(dispatch_signals) + contract_signals_count

        # Log to agent_activity_log
        summary_msg = (
            f"Weather Agent daily scan completed. Scanned {in_transit_count} in-transit dispatches "
            f"and {len(contracts)} contracts due this week. Created {total_signals} new weather risk signals."
        )

        try:
            self.sb.table("agent_activity_log").insert({
                "agent_name": "Weather Agent",
                "action_type": "daily_scan",
                "summary": summary_msg,
                "detail": {
                    "dispatches_scanned": in_transit_count,
                    "contracts_scanned": len(contracts),
                    "dispatch_signals_created": len(dispatch_signals),
                    "contract_signals_created": contract_signals_count,
                    "duration_ms": duration
                },
                "contracts_affected": len(dispatch_signals) + contracts_affected_count,
                "duration_ms": duration
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log Weather Agent activity: {e}")

        return {
            "dispatches_scanned": in_transit_count,
            "contracts_scanned": len(contracts),
            "signals_created": total_signals,
            "duration_ms": duration
        }
