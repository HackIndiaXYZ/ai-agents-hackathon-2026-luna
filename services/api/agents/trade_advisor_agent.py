"""
TradeNexus — Trade Advisor Agent (Primary LLM Reasoning Layer).

Orchestrates multi-domain agricultural trade reasoning by synthesizing structured outputs
from the Commodity Intelligence Agent, Market Intelligence Agent, and Dispatch Intelligence Agent
into a unified trader-facing advisory recommendation.
"""

import json
import logging
import asyncio
import datetime
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

from core.llm_provider import LLMProvider
from agents.commodity_agent import CommodityAgent, ResolutionResult
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent

logger = logging.getLogger("trade_advisor_agent")
logger.setLevel(logging.INFO)


class MarketOption(BaseModel):
    """Structured mandi option containing price and status details."""
    mandi: str
    state: str
    modal_price: float
    unit: str
    anomaly_flag: bool = False


class RouteOption(BaseModel):
    """Structured details of transport route corridor."""
    origin: str
    destination: str
    distance_km: float
    estimated_hours: float
    confidence_score: float
    delay_risk: str
    recent_reports_count: int
    typical_hours: float


class TradeRecommendation(BaseModel):
    """Unified trade advice payload return model."""
    commodity: str
    resolution_tier: str
    top_markets: List[MarketOption]
    best_route: Optional[RouteOption] = None
    active_alerts: List[dict]
    ai_recommendation: str
    confidence_score: float
    data_freshness: str


class TradeAdvisorAgent:
    """Multi-agent orchestrating advisory coordinator."""

    def __init__(
        self,
        llm_provider: LLMProvider,
        commodity_agent: CommodityAgent,
        market_agent: MarketAgent,
        dispatch_agent: DispatchAgent
    ):
        self.llm = llm_provider
        self.commodity_agent = commodity_agent
        self.market_agent = market_agent
        self.dispatch_agent = dispatch_agent

    async def get_recommendation(
        self,
        commodity_input: str,
        origin: str,
        quantity: float = None
    ) -> TradeRecommendation:
        """
        Synthesize multi-agent inputs and generate a comprehensive advice recommendation.

        Step 1: Resolve commodity alias to canonical commodity details.
        Step 2: Query latest market pricing details and trends.
        Step 3: Run parallel score corridor checks for the top 3 high-value mandis.
        Step 4: Consolidate telemetry data into standard structured JSON context.
        Step 5: Invoke single-pass LLM synthesis call.
        Step 6: Compose and return TradeRecommendation payload.
        """
        # Step 1: Resolve name cascading
        resolution: ResolutionResult = await self.commodity_agent.resolve(commodity_input)
        
        # If unknown, raise or gracefully build an unknown recommendation
        if resolution.tier == "unknown" or not resolution.commodity_id:
            return TradeRecommendation(
                commodity=commodity_input,
                resolution_tier="unknown",
                top_markets=[],
                best_route=None,
                active_alerts=[],
                ai_recommendation=f"Could not resolve commodity '{commodity_input}'. Please check regional names or dialects.",
                confidence_score=0.0,
                data_freshness="Stale"
            )

        canonical_name = resolution.canonical_name or commodity_input
        commodity_id = resolution.commodity_id

        # Step 2: Market summary pricing
        language_hint = resolution.language_detected or "en"
        market_summary = await self.market_agent.get_market_summary(commodity_id, language=language_hint)

        top_mandis = market_summary.get("top_mandis", [])
        prices_list = market_summary.get("prices", [])
        active_alerts = market_summary.get("alerts", [])

        # Step 3: Run corridor queries in parallel for the top 3 markets
        # We target f"{mandi_name}, {state}" as the geocoded address destination.
        tasks = []
        for mandi in top_mandis[:3]:
            dest_address = f"{mandi['mandi_name']}, {mandi['state']}"
            tasks.append(self.dispatch_agent.score_corridor(origin, dest_address))

        route_results = []
        if tasks:
            route_results = await asyncio.gather(*tasks, return_exceptions=True)
            # Filter out exceptions
            route_results = [r for r in route_results if not isinstance(r, Exception)]

        # Map top_mandis to MarketOptions with anomaly flags
        market_options = []
        for m in top_mandis[:3]:
            # Locate original price row to discover if it was marked as anomaly
            anomaly_flag = False
            for p in prices_list:
                if p["mandi_name"] == m["mandi_name"] and p["state"] == m["state"]:
                    anomaly_flag = bool(p.get("is_anomaly", False))
                    break

            market_options.append(MarketOption(
                mandi=m["mandi_name"],
                state=m["state"],
                modal_price=m["modal_price"],
                unit=m["unit"],
                anomaly_flag=anomaly_flag
            ))

        # Map routes output to RouteOption
        route_options = []
        for r in route_results:
            route_options.append(RouteOption(
                origin=r["origin"],
                destination=r["destination"],
                distance_km=r["distance_km"],
                estimated_hours=r["estimated_hours"],
                confidence_score=r["confidence_score"],
                delay_risk=r["delay_risk"],
                recent_reports_count=r["recent_reports_count"],
                typical_hours=r["typical_hours"]
            ))

        best_route = route_options[0] if route_options else None

        # Step 4: Build a structured context dict
        context_dict = {
            "resolved_commodity": {
                "input": commodity_input,
                "canonical": canonical_name,
                "tier": resolution.tier,
                "confidence": resolution.confidence
            },
            "origin_dispatch": origin,
            "quantity_quintals": quantity,
            "top_market_prices": [
                {
                    "mandi": mo.mandi,
                    "state": mo.state,
                    "price_per_unit": mo.modal_price,
                    "unit": mo.unit,
                    "is_anomaly": mo.anomaly_flag
                }
                for mo in market_options
            ],
            "corridors_logistics": [
                {
                    "destination": ro.destination,
                    "distance_km": ro.distance_km,
                    "transit_hours": ro.estimated_hours,
                    "reliability_confidence": ro.confidence_score,
                    "delay_risk": ro.delay_risk,
                    "recent_delay_incidents": ro.recent_reports_count
                }
                for ro in route_options
            ],
            "active_market_alerts": [
                {
                    "mandi": a.get("mandi_name"),
                    "state": a.get("state"),
                    "message": a.get("message"),
                    "type": a.get("alert_type")
                }
                for a in active_alerts
            ]
        }

        # Step 5: Single LLM call with full context
        language_map = {
            "hi": "Hindi",
            "gu": "Gujarati",
            "mr": "Marathi",
            "te": "Telugu",
            "ta": "Tamil",
            "kn": "Kannada",
            "ml": "Malayalam",
            "pa": "Punjabi",
            "en": "English",
        }
        target_lang = language_map.get(language_hint.lower(), "English")

        system_prompt = (
            "You are TradeNexus, an AI trade intelligence advisor for Indian "
            "commodity traders. You receive structured market data and must "
            "provide a clear, actionable recommendation. Be direct and specific. "
            "Address: where to sell, when to dispatch, and whether the route "
            "is reliable. Mention specific prices and mandis. Keep it under "
            f"150 words. Respond in {target_lang} if specified."
        )

        user_prompt = f"Corridor context telemetry details:\n{json.dumps(context_dict, indent=2)}"

        try:
            ai_recommendation = await self.llm.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expect_json=False,
                max_tokens=300
            )
        except Exception as exc:
            logger.error(f"LLM advisory synthesis failed: {exc}")
            # Fallback advice
            if best_route and market_options:
                ai_recommendation = (
                    f"Recommended: Transport {canonical_name} from {origin} to {market_options[0].mandi} "
                    f"({market_options[0].state}) where prices are currently ₹{market_options[0].modal_price}/{market_options[0].unit}. "
                    f"The route is {best_route.distance_km} km with a {best_route.delay_risk}-risk delay pattern. "
                    f"Secure permits and initiate dispatch immediately."
                )
            else:
                ai_recommendation = (
                    f"Market data shows stable arrivals for {canonical_name}. High demand clusters exist "
                    f"across premium corridors. Verify local mandi prices and routes before initiating transport."
                )

        # Derive data freshness
        data_freshness = "Stale"
        data_as_of = market_summary.get("data_as_of")
        if data_as_of:
            try:
                as_of_date = datetime.datetime.strptime(data_as_of, "%Y-%m-%d").date()
                days_diff = (datetime.date.today() - as_of_date).days
                if days_diff == 0:
                    data_freshness = "Live (today)"
                elif days_diff > 0:
                    data_freshness = f"Recent ({days_diff} days ago)"
            except Exception:
                pass

        # Calculate final confidence score
        overall_confidence = resolution.confidence
        if best_route:
            overall_confidence = round((resolution.confidence + best_route.confidence_score) / 2.0, 3)

        return TradeRecommendation(
            commodity=canonical_name,
            resolution_tier=resolution.tier,
            top_markets=market_options,
            best_route=best_route,
            active_alerts=active_alerts,
            ai_recommendation=ai_recommendation.strip(),
            confidence_score=overall_confidence,
            data_freshness=data_freshness
        )
