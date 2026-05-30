"""
TradeNexus — Trade Advisor Agent (Central Intelligence Coordinator).

Coordinates all deterministic agents (Market, Dispatch, Opportunity) and cognitive
agents (Compliance, CommodityIntelligence) to perform single-pass cognitive synthesis,
delivering high-value trading advice to commodity traders.
"""

from typing import Optional
from core.llm_provider import get_llm_provider
from agents.adaptive_agent import CommodityIntelligenceAgent
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent
from agents.compliance_agent import ComplianceAgent


class TradeAdvisorAgent:
    """Agent responsible for multi-agent synthesis and final recommendations."""

    def __init__(self):
        self.llm = get_llm_provider()
        self.resolver = CommodityIntelligenceAgent()
        self.market_agent = MarketAgent()
        self.dispatch_agent = DispatchAgent()
        self.compliance_agent = ComplianceAgent()

    async def generate_recommendation(
        self, query: str, origin: str, destination: str, language: Optional[str] = "en"
    ) -> dict:
        """
        Synthesize multi-agent data feeds and generate executive advice.
        """
        # Step 1: Resolve regional name query to canonical
        resolution = await self.resolver.resolve(query, language)
        canonical_commodity = resolution["canonical_name"]

        # Step 2: Fetch market intelligence at origin and destination
        market_origin = await self.market_agent.analyze(canonical_commodity, origin)
        market_dest = await self.market_agent.analyze(canonical_commodity, destination)

        # Step 3: Fetch logistics and route planning details
        dispatch_plan = await self.dispatch_agent.plan(canonical_commodity, origin, destination)

        # Step 4: Fetch compliance permits
        compliance_check = await self.compliance_agent.check(canonical_commodity, origin, destination)

        # Step 5: Synthesize executive summary using a single-pass LLM call
        system_prompt = (
            "You are TradeNexus's Senior Agricultural Trade Intelligence Advisor.\n"
            "Your role is to analyze a comprehensive data feed for a specific Indian commodity "
            "transport corridor and write a professional, highly-actionable intelligence summary.\n"
            "Respond in a direct, advisory, startup-grade tone. Focus on profit maximization, "
            "logistics efficiency, and compliance risk avoidance.\n"
            "Strictly structure your response using clear markdown headings:\n"
            "### Executive Summary\n"
            "### Financial Profitability Outlook\n"
            "### Logistics & Transport Action Plan\n"
            "### Regulatory Compliance Alert\n"
            "Write the recommendation in the requested language (Hindi, Marathi, Gujarati, Telugu, Tamil, or English)."
        )

        user_prompt = (
            f"Please synthesize the following trade corridor telemetry data for language context '{language}':\n\n"
            f"- Commodity Name: '{canonical_commodity}' (resolved from search: '{query}')\n"
            f"- Origin Mandi: {origin} | Average Price: INR {market_origin['avg_price_inr_quintal']}/quintal | Trend: {market_origin['trend_percentage']}\n"
            f"- Destination Mandi: {destination} | Average Price: INR {market_dest['avg_price_inr_quintal']}/quintal | Trend: {market_dest['trend_percentage']}\n"
            f"- Distance: {dispatch_plan['distance_km']} km | Transit Duration: {dispatch_plan['duration_hours']} hours | Route Utility: {dispatch_plan['utility_score']}/100\n"
            f"- Total Logistics Cost: INR {dispatch_plan['costs']['total_logistics_cost_inr']} per truckload\n"
            f"- Mandatory Permits: {', '.join(compliance_check['permits_required'])}\n"
            f"- Interstate Compliance Status: {'INTERSTATE Permitting Required' if compliance_check['interstate_gst_required'] else 'INTRASTATE Permitting Required'}\n"
        )

        try:
            synthesis = await self.llm.generate(system_prompt, user_prompt, temperature=0.3)
        except Exception as e:
            print(f"[TradeAdvisorAgent] Synthesis failed: {e}. Generating fallback advice...")
            synthesis = self._fallback_synthesis(canonical_commodity, origin, destination, dispatch_plan, compliance_check)

        return {
            "query": query,
            "resolved_commodity": canonical_commodity,
            "resolution_details": resolution,
            "market_intelligence": {
                "origin": market_origin,
                "destination": market_dest,
                "gross_spread_per_quintal_inr": round(market_dest["avg_price_inr_quintal"] - market_origin["avg_price_inr_quintal"], 2)
            },
            "logistics_plan": dispatch_plan,
            "compliance_permits": compliance_check,
            "executive_synthesis": synthesis,
            "advisor_version": "1.0.0"
        }

    def _fallback_synthesis(
        self, commodity: str, origin: str, destination: str, dispatch: dict, compliance: dict
    ) -> str:
        """Fallback synthesis text block if the LLM provider encounters an error."""
        return (
            f"### Executive Summary\n"
            f"TradeNexus fallback advisory completed. Highly profitable corridor identified for `{commodity}` from `{origin}` to `{destination}`. "
            f"Current route efficiency is optimized.\n\n"
            f"### Financial Profitability Outlook\n"
            f"Transportation cost is estimated at INR {dispatch['costs']['total_logistics_cost_inr']} per standard 10-tonne truck. "
            f"Ensure to secure buyers in `{destination}` before dispatching cargo to offset local mandi fees.\n\n"
            f"### Logistics & Transport Action Plan\n"
            f"Distance measures `{dispatch['distance_km']} km` with a travel duration of `{dispatch['duration_hours']} hours`. "
            f"Route rating is considered `{dispatch['status']}`.\n\n"
            f"### Regulatory Compliance Alert\n"
            f"Permits required: `{', '.join(compliance['permits_required'])}`. "
            f"FSSAI and local APMC clearance certificates must be filed before transport."
        )
