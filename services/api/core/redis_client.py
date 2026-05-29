"""
TradeNexus API — Upstash Redis REST client.

Uses httpx for REST-based Redis access (no redis-py dependency).
"""

import httpx
from core.config import get_settings


class UpstashRedis:
    """Lightweight Upstash Redis REST client."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.UPSTASH_REDIS_REST_URL
        self.token = settings.UPSTASH_REDIS_REST_TOKEN
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def _request(self, *args: str) -> dict:
        """Send a command to the Upstash Redis REST API."""
        url = f"{self.base_url}/{'/'.join(args)}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get(self, key: str) -> str | None:
        """Get a value by key."""
        result = await self._request("get", key)
        return result.get("result")

    async def set(self, key: str, value: str, ex: int | None = None) -> str:
        """Set a key-value pair with optional expiry in seconds."""
        if ex is not None:
            result = await self._request("set", key, value, "EX", str(ex))
        else:
            result = await self._request("set", key, value)
        return result.get("result")

    async def delete(self, key: str) -> int:
        """Delete a key."""
        result = await self._request("del", key)
        return result.get("result")


_redis: UpstashRedis | None = None


def get_redis_client() -> UpstashRedis:
    """Return a shared Upstash Redis client instance."""
    global _redis
    if _redis is None:
        _redis = UpstashRedis()
    return _redis
