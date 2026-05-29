"""
TradeNexus API — Core configuration module.

Uses pydantic-settings to read all environment variables from .env files.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Supabase (PostgreSQL) ---
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # --- Upstash Redis (REST API) ---
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # --- Nvidia API ---
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "qwen/qwen3.5-397b-a17b"

    # --- Data.gov.in API ---
    DATA_GOV_API_KEY: str = ""

    # --- Adaption AI API ---
    ADAPTION_API_KEY: str = ""

    # --- Google Maps Platform ---
    GOOGLE_MAPS_API_KEY: str = ""

    # --- App Environment ---
    ENVIRONMENT: str = "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance (singleton pattern)."""
    return Settings()
