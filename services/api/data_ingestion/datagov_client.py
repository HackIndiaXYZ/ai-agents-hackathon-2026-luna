"""
TradeNexus — Data.gov.in API client.

Fetches commodity market data from the Indian government's
open data platform (data.gov.in).
"""

import httpx
from core.config import get_settings


class DataGovClient:
    """Client for fetching commodity market data from data.gov.in."""

    BASE_URL = "https://api.data.gov.in/resource"

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.DATA_GOV_API_KEY

    async def fetch_market_prices(self, resource_id: str, **filters) -> dict:
        """Fetch market price data from a specific data.gov.in resource."""
        params = {
            "api-key": self.api_key,
            "format": "json",
            "limit": 100,
            **filters,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{resource_id}", params=params
            )
            response.raise_for_status()
            return response.json()
