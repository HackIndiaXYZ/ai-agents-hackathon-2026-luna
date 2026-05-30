"""
TradeNexus — Dispatch Planning Agent.

Computes logistics costs, fuel indices, and route utilities deterministically
leveraging Google Routes API v2 via MapsClient. Enforces a zero-LLM boundary.
"""

from data_ingestion.maps_client import MapsClient


class DispatchAgent:
    """Agent responsible for dispatch and route optimization."""

    def __init__(self):
        self.maps_client = MapsClient()

    async def plan(self, commodity: str, origin: str, destination: str) -> dict:
        """
        Generate a comprehensive dispatch plan for a commodity shipment.
        Computes distances, logistics costs, and route utility deterministically.
        """
        # Fetch routes metrics from MapsClient
        route_metrics = await self.maps_client.compute_route(origin, destination)
        distance_km = route_metrics["distance_km"]
        duration_hours = route_metrics["duration_hours"]

        # Logistics calculation formulas (deterministic standards for Indian trucking)
        diesel_price_inr = 94.5
        kms_per_liter = 3.5  # Average truck fuel economy
        fuel_cost_inr = round((distance_km / kms_per_liter) * diesel_price_inr, 2)
        
        toll_cost_inr = round(distance_km * 1.8, 2)  # ~1.8 INR per km toll average
        driver_allowance_inr = round(max(1500.0, duration_hours * 150.0), 2)
        other_fees_inr = 800.0  # APMC entry cess, handling, unloading overheads
        
        total_logistics_cost_inr = round(fuel_cost_inr + toll_cost_inr + driver_allowance_inr + other_fees_inr, 2)
        cost_per_km = round(total_logistics_cost_inr / distance_km, 2) if distance_km > 0 else 0.0

        # Route Utility Score (100-point scale: higher is more efficient / cost-effective)
        # Penalizes high distance, high duration, and high costs
        base_utility = 100.0
        distance_penalty = distance_km * 0.04
        duration_penalty = duration_hours * 0.4
        utility_score = max(15.0, min(98.0, round(base_utility - distance_penalty - duration_penalty, 1)))

        if utility_score > 75.0:
            status = "EXCELLENT"
            rec = "Highly recommended trade corridor. Low cost index and minimal transit time."
        elif utility_score >= 50.0:
            status = "VIABLE"
            rec = "Viable trade corridor. Maintain standard speed limit and proceed during off-peak hours."
        else:
            status = "SUBOPTIMAL"
            rec = "High transit overhead detected. Monitor regional fuel prices and verify toll routes."

        return {
            "origin": origin,
            "destination": destination,
            "distance_km": distance_km,
            "duration_hours": duration_hours,
            "costs": {
                "fuel_cost_inr": fuel_cost_inr,
                "toll_cost_inr": toll_cost_inr,
                "driver_allowance_inr": driver_allowance_inr,
                "other_fees_inr": other_fees_inr,
                "total_logistics_cost_inr": total_logistics_cost_inr,
                "cost_per_km_inr": cost_per_km
            },
            "utility_score": utility_score,
            "status": status,
            "recommendation": rec,
            "source": f"dispatch_engine_v2 (routes_source: {route_metrics['source']})"
        }
