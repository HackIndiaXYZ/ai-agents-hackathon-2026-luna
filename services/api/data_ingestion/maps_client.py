"""
TradeNexus — Google Maps Platform client.

Provides geocoding, distance matrix, and route optimization
for dispatch planning across Indian trade corridors.
"""

import httpx
from core.config import get_settings


class MapsClient:
    """Client for Google Maps Platform APIs."""

    BASE_URL = "https://maps.googleapis.com/maps/api"

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.GOOGLE_MAPS_API_KEY

    async def distance_matrix(
        self, origins: list[str], destinations: list[str]
    ) -> dict:
        """Get distance and travel time between origins and destinations."""
        params = {
            "origins": "|".join(origins),
            "destinations": "|".join(destinations),
            "key": self.api_key,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/distancematrix/json", params=params
            )
            response.raise_for_status()
            return response.json()
