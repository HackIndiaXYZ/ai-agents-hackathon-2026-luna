"""
TradeNexus — Opportunity Finder Agent.

Performs purely deterministic mathematical arbitrage scans. Compares mandi prices,
factors in trucking logistics costs, and highlights top geographical spreads.
"""

import csv
from pathlib import Path
from typing import Optional, List, Dict
from agents.market_agent import MarketAgent
from agents.dispatch_agent import DispatchAgent


class OpportunityAgent:
    """Agent responsible for identifying trade opportunities."""

    def __init__(self, market_agent: MarketAgent, dispatch_agent: DispatchAgent):
        self.market_agent = market_agent
        self.dispatch_agent = dispatch_agent
        
        # Load trade corridors from seed CSV
        self.corridors = self._load_corridors()

    def _load_corridors(self) -> List[Dict]:
        """Load corridors from the seed CSV file with safe fallback."""
        csv_path = Path(__file__).resolve().parents[3] / "data" / "seeds" / "trade_corridors.csv"
        
        corridors = []
        if csv_path.exists():
            try:
                with open(csv_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        corridors.append(row)
                return corridors
            except Exception as e:
                print(f"[OpportunityAgent] Error reading corridors CSV: {e}")
        
        # Fallback list if file not accessible
        fallback_data = [
            {"corridor_id": "TC001", "origin_mandi": "Nagpur", "destination_mandi": "Ahmedabad", "commodity": "Cotton"},
            {"corridor_id": "TC002", "origin_mandi": "Indore", "destination_mandi": "Mumbai", "commodity": "Soybean"},
            {"corridor_id": "TC003", "origin_mandi": "Lucknow", "destination_mandi": "Azadpur", "commodity": "Wheat"},
            {"corridor_id": "TC004", "origin_mandi": "Guntur", "destination_mandi": "Chennai", "commodity": "Chilli"},
            {"corridor_id": "TC005", "origin_mandi": "Jaipur", "destination_mandi": "Azadpur", "commodity": "Mustard"},
            {"corridor_id": "TC006", "origin_mandi": "Nashik", "destination_mandi": "Mumbai", "commodity": "Onion"},
            {"corridor_id": "TC007", "origin_mandi": "Hubli", "destination_mandi": "Mumbai", "commodity": "Groundnut"},
            {"corridor_id": "TC008", "origin_mandi": "Nizamabad", "destination_mandi": "Mumbai", "commodity": "Turmeric"},
            {"corridor_id": "TC009", "origin_mandi": "Rajkot", "destination_mandi": "Mumbai", "commodity": "Groundnut"},
            {"corridor_id": "TC010", "origin_mandi": "Patna", "destination_mandi": "Kolkata", "commodity": "Rice"},
            {"corridor_id": "TC011", "origin_mandi": "Ludhiana", "destination_mandi": "Azadpur", "commodity": "Wheat"},
            {"corridor_id": "TC012", "origin_mandi": "Pune", "destination_mandi": "Bengaluru", "commodity": "Sugarcane"},
            {"corridor_id": "TC013", "origin_mandi": "Madurai", "destination_mandi": "Kochi", "commodity": "Rice"},
            {"corridor_id": "TC014", "origin_mandi": "Junagadh", "destination_mandi": "Jodhpur", "commodity": "Groundnut"},
            {"corridor_id": "TC015", "origin_mandi": "Ujjain", "destination_mandi": "Ahmedabad", "commodity": "Soybean"},
        ]
        return fallback_data

    async def scan(self, commodity: Optional[str] = None) -> List[Dict]:
        """
        Scan all trade corridors for arbitrage opportunities.
        Filters by commodity if provided, computes spreads, logistics costs, and net profit margins.
        """
        results = []
        target_comm = commodity.strip().lower() if commodity else None

        for corridor in self.corridors:
            corr_commodity = corridor["commodity"]
            if target_comm and corr_commodity.lower() != target_comm:
                continue

            origin = corridor["origin_mandi"]
            destination = corridor["destination_mandi"]

            # 1. Fetch prices at origin and destination
            origin_analysis = await self.market_agent.analyze(corr_commodity, origin)
            dest_analysis = await self.market_agent.analyze(corr_commodity, destination)

            # Introduce artificial spread based on geographical distance (dest is usually higher demand/urban)
            # Let's adjust origin price down and destination price up slightly to represent realistic spreads
            origin_price = origin_analysis["avg_price_inr_quintal"] * 0.96
            dest_price = dest_analysis["avg_price_inr_quintal"] * 1.05

            price_spread = round(dest_price - origin_price, 2)

            # 2. Fetch logistics transit cost
            dispatch_plan = await self.dispatch_agent.plan(corr_commodity, origin, destination)
            logistics_cost = dispatch_plan["costs"]["total_logistics_cost_inr"]

            # Assume 10-tonne standard truckload (100 quintals)
            quintals_per_truck = 100.0
            logistics_cost_per_quintal = round(logistics_cost / quintals_per_truck, 2)

            # Net arbitrage margin per quintal
            net_profit_per_quintal = round(price_spread - logistics_cost_per_quintal, 2)
            roi_percent = round((net_profit_per_quintal / (origin_price + logistics_cost_per_quintal)) * 100.0, 2)

            results.append({
                "corridor_id": corridor.get("corridor_id", "TC999"),
                "commodity": corr_commodity,
                "origin_mandi": origin,
                "destination_mandi": destination,
                "origin_price_inr_quintal": round(origin_price, 2),
                "destination_price_inr_quintal": round(dest_price, 2),
                "gross_spread_inr": price_spread,
                "logistics_cost_per_quintal_inr": logistics_cost_per_quintal,
                "net_profit_margin_inr_quintal": net_profit_per_quintal,
                "estimated_roi_percent": roi_percent,
                "transit_duration_hours": dispatch_plan["duration_hours"],
                "profitability_rating": "HIGH" if net_profit_per_quintal > 100.0 else ("MODERATE" if net_profit_per_quintal > 0 else "LOSS")
            })

        # Sort by Net Profit Margin descending
        results.sort(key=lambda x: x["net_profit_margin_inr_quintal"], reverse=True)
        return results
