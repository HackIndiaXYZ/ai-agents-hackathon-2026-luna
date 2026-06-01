"""
TradeNexus — Buyer Discovery Agent.

Finds and ranks potential buyers for a commodity based on geographical
proximity (same city, same state, neighboring states, others) and demand volume.
"""

import logging
from typing import Optional, List, Dict, Any
from agents.commodity_agent import CommodityAgent

logger = logging.getLogger("buyer_discovery_agent")
logger.setLevel(logging.INFO)

# Hardcoded neighboring states for geographic ranking
NEIGHBORS = {
    "maharashtra": {"gujarat", "madhya pradesh", "chhattisgarh", "telangana", "karnataka", "goa"},
    "gujarat": {"rajasthan", "madhya pradesh", "maharashtra"},
    "madhya pradesh": {"uttar pradesh", "rajasthan", "gujarat", "maharashtra", "chhattisgarh"},
    "delhi": {"haryana", "uttar pradesh", "rajasthan"},
    "rajasthan": {"punjab", "haryana", "uttar pradesh", "madhya pradesh", "gujarat"},
    "uttar pradesh": {"uttaranchal", "himachal pradesh", "haryana", "delhi", "rajasthan", "madhya pradesh", "chhattisgarh", "jharkhand", "bihar"},
    "haryana": {"punjab", "himachal pradesh", "rajasthan", "delhi", "uttar pradesh"},
    "punjab": {"jammu & kashmir", "himachal pradesh", "haryana", "rajasthan"},
    "chhattisgarh": {"madhya pradesh", "uttar pradesh", "jharkhand", "odisha", "andhra pradesh", "telangana", "maharashtra"},
    "telangana": {"maharashtra", "chhattisgarh", "karnataka", "andhra pradesh"},
    "andhra pradesh": {"odisha", "chhattisgarh", "telangana", "karnataka", "tamil nadu"},
    "karnataka": {"goa", "maharashtra", "telangana", "andhra pradesh", "tamil nadu", "kerala"},
    "tamil nadu": {"andhra pradesh", "karnataka", "kerala"}
}


class BuyerDiscoveryAgent:
    """Agent responsible for finding the most suitable buyers for commodities based on geography and volume."""

    def __init__(self, commodity_agent: CommodityAgent, supabase_client):
        self.commodity_agent = commodity_agent
        self.sb = supabase_client

    async def find_buyers(
        self,
        commodity_input: str,
        origin_city: Optional[str] = None,
        origin_state: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find buyers matching the resolved commodity and rank them by geographic proximity.
        """
        try:
            # 1. Resolve commodity name
            res_resolve = await self.commodity_agent.resolve(commodity_input)
            if not res_resolve.canonical_name:
                logger.warning(f"Could not resolve commodity input: '{commodity_input}'")
                canonical_name = commodity_input
            else:
                canonical_name = res_resolve.canonical_name

            # 2. Query all buyers (safe to fetch all 30 buyers for ranking)
            res = self.sb.table("buyers").select("*").execute()
            if not res.data:
                return []

            # 3. Filter matching buyers (case-insensitive commodity in commodities_needed array)
            matched_buyers = []
            for b in res.data:
                needs = [n.lower() for n in (b.get("commodities_needed") or [])]
                if canonical_name.lower() in needs:
                    matched_buyers.append(b)

            # 4. Rank matched buyers geographically
            def get_rank_and_volume(buyer: Dict[str, Any]) -> tuple:
                b_city = buyer.get("city", "").strip().lower()
                b_state = buyer.get("state", "").strip().lower()

                o_city = origin_city.strip().lower() if origin_city else ""
                o_state = origin_state.strip().lower() if origin_state else ""

                # Same city
                if o_city and b_city == o_city:
                    rank = 1
                # Same state
                elif o_state and b_state == o_state:
                    rank = 2
                # Neighboring state
                elif o_state and b_state in NEIGHBORS.get(o_state, set()):
                    rank = 3
                # Other
                else:
                    rank = 4

                volume = int(buyer.get("typical_volume_quintals") or 0)
                # Sort primarily by rank ascending, then by typical volume descending
                return (rank, -volume)

            matched_buyers.sort(key=get_rank_and_volume)

            # 5. Attach geographic rank labels and return up to limit
            ranked_results = []
            for b in matched_buyers[:limit]:
                rank_tuple = get_rank_and_volume(b)
                rank = rank_tuple[0]
                rank_label = "Same City" if rank == 1 else "Same State" if rank == 2 else "Neighboring State" if rank == 3 else "Other Region"

                ranked_results.append({
                    "id": b["id"],
                    "name": b["name"],
                    "type": b["type"],
                    "city": b["city"],
                    "state": b["state"],
                    "lat": float(b["lat"]) if b.get("lat") else None,
                    "lng": float(b["lng"]) if b.get("lng") else None,
                    "commodities_needed": b["commodities_needed"],
                    "typical_volume_quintals": b["typical_volume_quintals"],
                    "contact_placeholder": b.get("contact_placeholder", "Contact via TradeNexus"),
                    "verified": bool(b.get("verified", False)),
                    "geo_rank": rank_label
                })

            return ranked_results

        except Exception as e:
            logger.error(f"Error in find_buyers: {e}")
            return []

    def get_buyer_summary(self, buyers: List[Dict[str, Any]], canonical_commodity: str) -> str:
        """Generate a natural language summary of the discovered buyers."""
        if not buyers:
            return f"No verified buyers were found in our network for {canonical_commodity}."

        top_buyer = buyers[0]
        verified_count = sum(1 for b in buyers if b.get("verified"))

        summary = (
            f"Found {len(buyers)} prospective buyers in the 'TradeNexus Buyer Network (Beta)' for {canonical_commodity}. "
            f"Our top match is {top_buyer['name']} ({top_buyer['geo_rank']}) located in {top_buyer['city']}, {top_buyer['state']}, "
            f"with a typical demand of {top_buyer['typical_volume_quintals']} quintals. "
            f"There are {verified_count} verified buyers in the matching cohort."
        )
        return summary
