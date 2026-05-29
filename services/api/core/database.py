"""
TradeNexus API — Supabase database client.

Initializes and provides a shared Supabase client instance.
"""

from supabase import create_client, Client
from core.config import get_settings


_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a shared Supabase client instance."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client
