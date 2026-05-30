"""
TradeNexus API — Core configuration module.

Uses pydantic-settings to read all environment variables from .env files.
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Dynamically locate the .env file in parent directories
_current_dir = Path(__file__).resolve().parent
_env_file_path = Path(".env") # fallback

for _parent in [_current_dir] + list(_current_dir.parents):
    _candidate = _parent / ".env"
    if _candidate.exists():
        _env_file_path = _candidate
        break


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
    LLM_PROVIDER: str = "nvidia"

    # --- Security and Internal Keys ---
    INTERNAL_KEY: str = ""

    # --- Data.gov.in API ---
    DATA_GOV_API_KEY: str = ""

    # --- Adaption AI API ---
    ADAPTION_API_KEY: str = ""

    # --- Google Routes API ---
    GOOGLE_ROUTES_API_KEY: str = ""

    # --- App Environment ---
    ENVIRONMENT: str = "development"

    model_config = {
        "env_file": str(_env_file_path),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance (singleton pattern)."""
    return Settings()
